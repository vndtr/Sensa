import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import BookText, { BookTextRef } from '../../components/reader/BookText';
import SelectionMenu from '../../components/reader/SelectionMenu';
import SoloNoteModal from '../../components/reader/SoloNoteModal';
import ReaderSettingsModal from '../../components/reader/ReaderSettingsModal';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { bookService, Book } from '../../services/book';
import { soloSessionService, SoloSession } from '../../services/soloSession';
import { soloNoteService, SoloNote, SoloNoteCreate } from '../../services/soloNote';
import { soloQuoteService, SoloQuote, SoloQuoteCreate } from '../../services/soloQuote';
import { useAuthStore } from '../../store/authStore';
import { commonStyles } from '../../styles/common';
interface Annotation {
  id: number;
  type: 'quote' | 'note';
  text: string;
  comment?: string;
  color: string;
  startIndex: number;
  endIndex: number;
  createdAt?: string;
}

interface HighlightData {
  type: 'highlight' | 'underline';
  color: string;
  start: number;
  end: number;
}

const CHUNK_SIZE = 3000;

export default function SoloReader() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookId, bookTitle, bookAuthor } = route.params as any;
  const { user, updateProfile } = useAuthStore();

  const bookTextRef = useRef<BookTextRef>(null);

  // Состояние
  const [loading, setLoading] = useState(true);
  const [bookInfo, setBookInfo] = useState<Book | null>(null);
  const [soloSession, setSoloSession] = useState<SoloSession | null>(null);
  const [fullBookText, setFullBookText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // Выделение текста
  const [selectionMenuVisible, setSelectionMenuVisible] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [selectedEndIndex, setSelectedEndIndex] = useState(0);

  // Модалки заметок
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Annotation | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Фильтры
  const [filterType, setFilterType] = useState<'all' | 'note' | 'quote'>('all');

  // Настройки из профиля пользователя
  const currentFontSize = user?.font_size || 16;
  const currentBackgroundColor = user?.background_color || '#ffffff';

  // Обработчик сохранения настроек
  const handleSaveSettings = async (fontSize: number, backgroundColor: string) => {
    try {
      await updateProfile({ 
        font_size: fontSize, 
        background_color: backgroundColor 
      });
      Alert.alert('Успешно', 'Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  // Загрузка полного текста книги
  const loadFullBookContent = async (contentPath: string) => {
    try {
      let allPages: Record<string, string> = {};
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const pages = await bookService.getBookContent(contentPath, offset, limit);
        allPages = { ...allPages, ...pages };
        
        if (Object.keys(pages).length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      const pageKeys = Object.keys(allPages).sort((a, b) => parseInt(a) - parseInt(b));
      const fullText = pageKeys.map(key => allPages[key]).join('\n\n');
      setFullBookText(fullText);
      
      const pagesCount = Math.ceil(fullText.length / CHUNK_SIZE);
      setTotalPages(pagesCount);
      
      return fullText;
    } catch (error) {
      console.error('Error loading full book content:', error);
      throw error;
    }
  };

  // Загрузка данных
  const loadSoloSessionData = async () => {
    try {
      setLoading(true);

      const book = await bookService.getBook(bookId);
      setBookInfo(book);

      const session = await soloSessionService.getOrCreateSession(bookId);
      if (!session || !session.id) {
        throw new Error('Failed to create session');
      }
      setSoloSession(session);

      await loadFullBookContent(book.content_path);
      await loadAnnotations(session.id);
      
      const progress = await soloSessionService.getProgress(session.id);
      setCurrentPage(progress.last_page || 0);

    } catch (error) {
      console.error('Error loading solo session:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить книгу');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Загрузка аннотаций
  const loadAnnotations = async (sessionId: number) => {
    try {
      const [notes, quotes] = await Promise.all([
        soloNoteService.getNotes(sessionId),
        soloQuoteService.getQuotes(sessionId),
      ]);

      const formattedNotes: Annotation[] = notes.map((note: SoloNote) => ({
        id: note.id,
        type: 'note',
        text: note.selected_text,
        comment: note.comment,
        color: note.color,
        startIndex: note.start_index,
        endIndex: note.end_index,
        createdAt: note.created_at,
      }));

      const formattedQuotes: Annotation[] = quotes.map((quote: SoloQuote) => ({
        id: quote.id,
        type: 'quote',
        text: quote.selected_text,
        color: quote.color,
        startIndex: quote.start_index,
        endIndex: quote.end_index,
        createdAt: quote.created_at,
      }));

      setAnnotations([...formattedNotes, ...formattedQuotes]);
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  };

  // Применение всех выделений на текущей странице
  const applyHighlightsToCurrentPage = useCallback(() => {
    if (!bookTextRef.current || !fullBookText) return;

    const pageStart = currentPage * CHUNK_SIZE;
    const pageEnd = Math.min((currentPage + 1) * CHUNK_SIZE, fullBookText.length);
    
    const pageAnnotations = annotations.filter(ann => {
      const annStart = ann.startIndex;
      const annEnd = ann.endIndex;
      return (annStart >= pageStart && annStart < pageEnd) || 
             (annEnd > pageStart && annEnd <= pageEnd) ||
             (annStart <= pageStart && annEnd >= pageEnd);
    });

    if (pageAnnotations.length === 0) return;

    const highlights: HighlightData[] = pageAnnotations.map(ann => {
      let start = Math.max(ann.startIndex - pageStart, 0);
      let end = Math.min(ann.endIndex - pageStart, CHUNK_SIZE);
      start = Math.max(start, 0);
      end = Math.min(end, CHUNK_SIZE);
      
      const highlightType: 'highlight' | 'underline' = ann.type === 'quote' ? 'highlight' : 'underline';
      
      return {
        type: highlightType,
        color: ann.color,
        start: start,
        end: end,
      };
    }).filter((hl): hl is HighlightData => hl.start < hl.end && hl.start >= 0 && hl.end <= CHUNK_SIZE);

    if (highlights.length > 0) {
      setTimeout(() => {
        bookTextRef.current?.applyAllHighlights(highlights);
      }, 300);
    }
  }, [currentPage, annotations, fullBookText]);

  useEffect(() => {
    if (!loading && fullBookText) {
      applyHighlightsToCurrentPage();
    }
  }, [currentPage, loading, fullBookText, applyHighlightsToCurrentPage]);

  useFocusEffect(
    useCallback(() => {
      loadSoloSessionData();
    }, [bookId])
  );

  const saveProgress = async (page: number) => {
    if (!soloSession) return;
    try {
      await soloSessionService.updateProgress(soloSession.id, page);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      saveProgress(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      saveProgress(newPage);
    }
  };

  const getCurrentPageText = (): string => {
    if (!fullBookText) return 'Загрузка...';
    const start = currentPage * CHUNK_SIZE;
    const end = Math.min((currentPage + 1) * CHUNK_SIZE, fullBookText.length);
    return fullBookText.substring(start, end);
  };

  const handleTextSelection = (text: string, start: number, end: number, x: number, y: number, isNearBottom: boolean) => {
    const pageStart = currentPage * CHUNK_SIZE;
    const globalStart = pageStart + start;
    const globalEnd = pageStart + end;
    
    setSelectedText(text);
    setSelectedStartIndex(globalStart);
    setSelectedEndIndex(globalEnd);
    const adjustedY = isNearBottom ? y - 120 : y;
    setSelectionPosition({ x, y: adjustedY });
    setSelectionMenuVisible(true);
  };

  const handleQuote = async (color: string) => {
    if (!soloSession) return;

    try {
      const newQuote: SoloQuoteCreate = {
        selected_text: selectedText,
        color: color,
        start_index: selectedStartIndex,
        end_index: selectedEndIndex,
        solo_session_id: soloSession.id,
      };

      const quote = await soloQuoteService.createQuote(newQuote);

      const annotation: Annotation = {
        id: quote.id,
        type: 'quote',
        text: quote.selected_text,
        color: quote.color,
        startIndex: quote.start_index,
        endIndex: quote.end_index,
        createdAt: quote.created_at,
      };

      setAnnotations(prev => [annotation, ...prev]);
      
      const pageStart = currentPage * CHUNK_SIZE;
      const localStart = selectedStartIndex - pageStart;
      const localEnd = selectedEndIndex - pageStart;
      bookTextRef.current?.applyHighlight(color, localStart, localEnd);

    } catch (error) {
      console.error('Error creating quote:', error);
      Alert.alert('Ошибка', 'Не удалось создать цитату');
    } finally {
      setSelectionMenuVisible(false);
      setSelectedText('');
    }
  };

  const handleNoteClick = () => {
    setSelectionMenuVisible(false);
    setNoteModalVisible(true);
  };

  const handleSaveNote = async (comment: string, color: string) => {
    if (!soloSession) return;

    try {
      const newNote: SoloNoteCreate = {
        selected_text: selectedText,
        color: color,
        comment: comment,
        start_index: selectedStartIndex,
        end_index: selectedEndIndex,
        solo_session_id: soloSession.id,
      };

      const note = await soloNoteService.createNote(newNote);

      const annotation: Annotation = {
        id: note.id,
        type: 'note',
        text: note.selected_text,
        comment: note.comment,
        color: note.color,
        startIndex: note.start_index,
        endIndex: note.end_index,
        createdAt: note.created_at,
      };

      setAnnotations(prev => [annotation, ...prev]);
      
      const pageStart = currentPage * CHUNK_SIZE;
      const localStart = selectedStartIndex - pageStart;
      const localEnd = selectedEndIndex - pageStart;
      bookTextRef.current?.applyUnderline(color, localStart, localEnd);

    } catch (error) {
      console.error('Error creating note:', error);
      Alert.alert('Ошибка', 'Не удалось создать заметку');
    } finally {
      setNoteModalVisible(false);
      setSelectedText('');
    }
  };

  const handleUpdateNote = async (comment: string, color: string) => {
    if (!editingNote || !soloSession) return;

    try {
      await soloNoteService.updateNote({
        id: editingNote.id,
        solo_session_id: soloSession.id,
        comment,
        color,
      });

      setAnnotations(prev => prev.map(a =>
        a.id === editingNote.id
          ? { ...a, comment, color }
          : a
      ));

      applyHighlightsToCurrentPage();

    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Ошибка', 'Не удалось обновить заметку');
    } finally {
      setEditModalVisible(false);
      setEditingNote(null);
    }
  };

  const handleDeleteAnnotation = async (id: number, type: string) => {
    if (!soloSession) return;

    Alert.alert(
      'Удаление',
      `Вы уверены, что хотите удалить ${type === 'note' ? 'заметку' : 'цитату'}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'note') {
                await soloNoteService.deleteNote(id, soloSession.id);
              } else {
                await soloQuoteService.deleteQuote(id, soloSession.id);
              }
              setAnnotations(prev => prev.filter(a => a.id !== id));
              setTimeout(() => applyHighlightsToCurrentPage(), 100);
            } catch (error) {
              console.error('Error deleting annotation:', error);
              Alert.alert('Ошибка', 'Не удалось удалить');
            }
          },
        },
      ]
    );
  };

  const handleAnnotationPress = (annotation: Annotation) => {
    const targetPage = Math.floor(annotation.startIndex / CHUNK_SIZE);
    
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      setTimeout(() => {
        const pageStart = targetPage * CHUNK_SIZE;
        const localStart = annotation.startIndex - pageStart;
        bookTextRef.current?.scrollToPosition(localStart);
      }, 500);
    } else {
      const pageStart = currentPage * CHUNK_SIZE;
      const localStart = annotation.startIndex - pageStart;
      bookTextRef.current?.scrollToPosition(localStart);
    }
    
    setShowAnnotationsPanel(false);
  };

  const filteredAnnotations = annotations.filter(ann => {
    if (filterType !== 'all' && ann.type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загрузка книги...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{bookInfo?.title || bookTitle}</Text>
          <Text style={styles.author}>{bookInfo?.author || bookAuthor}</Text>
        </View>

        <View style={styles.rightButtons}>
          <TouchableOpacity onPress={() => setShowAnnotationsPanel(!showAnnotationsPanel)} style={styles.iconButton}>
            <Image source={require('../../../assets/annotation.png')} style={commonStyles.iconMedium} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Выпадающее меню */}
      {menuVisible && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setMenuVisible(false);
              setSettingsModalVisible(true);
            }}
          >
            <Text style={styles.menuItemText}>Настройки</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.goBack()}>
            <Text style={styles.menuItemText}>Выйти</Text>
          </TouchableOpacity>
        </View>
      )}

      <ReaderSettingsModal
        visible={settingsModalVisible}
        currentFontSize={currentFontSize}
        currentBackgroundColor={currentBackgroundColor}
        onClose={() => setSettingsModalVisible(false)}
        onSave={handleSaveSettings}
      />

  

      {/* Текст книги */}
      <BookText
        ref={bookTextRef}
        text={getCurrentPageText()}
        fontSize={currentFontSize}
        backgroundColor={currentBackgroundColor}
        onSelection={handleTextSelection}
      />

      {/* Навигация по страницам */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
          onPress={goToPrevPage}
          disabled={currentPage === 0}
        >
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>Страница {currentPage + 1} из {totalPages}</Text>
        <TouchableOpacity
          style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
          onPress={goToNextPage}
          disabled={currentPage === totalPages - 1}
        >
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Панель аннотаций */}
      {showAnnotationsPanel && (
        <View style={styles.annotationsPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Мои заметки и цитаты</Text>
            <TouchableOpacity onPress={() => setShowAnnotationsPanel(false)}>
              <Text style={styles.closePanelButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filters}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Тип:</Text>
              <View style={styles.filterButtons}>
                {(['all', 'note', 'quote'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                      {type === 'all' ? 'Все' : type === 'note' ? 'Заметки' : 'Цитаты'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <FlatList
              data={filteredAnnotations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.annotationCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
                  onPress={() => handleAnnotationPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.annotationType}>
                      {item.type === 'quote' ? 'Цитата' : 'Заметка'}
                    </Text>
                    <View style={styles.cardActions}>
                      {item.type === 'note' && (
                        <TouchableOpacity
                          onPress={() => {
                            setEditingNote(item);
                            setEditModalVisible(true);
                          }}
                        >
                          <Image source={require('../../../assets/edit.png')} style={commonStyles.editIcon} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteAnnotation(item.id, item.type)}>
                        <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.quoteText}>"{item.text}"</Text>

                  {item.type === 'note' && item.comment && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.commentText}>{item.comment}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyAnnotations}>
                  <Text style={styles.emptyText}>Нет аннотаций</Text>
                  <Text style={styles.emptySubtext}>Выделите текст, чтобы создать цитату или заметку</Text>
                </View>
              }
            />
          </View>
        </View>
      )}

      {/* Меню выбора цвета */}
      <SelectionMenu
        visible={selectionMenuVisible}
        position={selectionPosition}
        onSelectColor={handleQuote}
        onNote={handleNoteClick}
        onClose={() => {
          setSelectionMenuVisible(false);
          setSelectedText('');
          bookTextRef.current?.clearSelection();
        }}
      />

      {/* Модалка создания заметки */}
      <SoloNoteModal
        visible={noteModalVisible}
        selectedText={selectedText}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedText('');
        }}
        onSave={handleSaveNote}
      />

      {/* Модалка редактирования заметки */}
      <SoloNoteModal
        visible={editModalVisible}
        selectedText={editingNote?.text || ''}
        initialComment={editingNote?.comment}
        initialColor={editingNote?.color}
        onClose={() => {
          setEditModalVisible(false);
          setEditingNote(null);
        }}
        onSave={handleUpdateNote}
        isEdit={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.textGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: { padding: spacing.sm },
  closeButtonText: { fontSize: 24, color: colors.primary },
  headerInfo: { flex: 1, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  author: { fontSize: 12, color: colors.textGray },
  rightButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { padding: spacing.sm, width: 40, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { fontSize: 22, color: colors.textDark },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 160,
  },
  menuItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8 },
  menuItemText: { fontSize: 16, color: colors.textDark },
  modeBadge: { backgroundColor: colors.primary + '20', paddingVertical: spacing.xs, alignItems: 'center' },
  modeText: { fontSize: 12, color: colors.primary },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  navButton: { padding: spacing.sm, backgroundColor: colors.primary, borderRadius: 20, width: 40, alignItems: 'center' },
  navButtonDisabled: { backgroundColor: colors.border },
  navButtonText: { color: colors.white, fontSize: 16 },
  pageInfo: { fontSize: 14, color: colors.textGray },
  annotationsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark },
  closePanelButton: { fontSize: 20, color: colors.textGray, padding: spacing.sm },
  filters: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterLabel: { fontSize: 12, color: colors.textGray, width: 40 },
  filterButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 },
  filterChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 16, backgroundColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.textGray },
  filterChipTextActive: { color: colors.white },
  annotationsList: { padding: spacing.md, paddingBottom: spacing.xxl },
  annotationCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  annotationType: { fontSize: 12, color: colors.textGray },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionText: { fontSize: 14 },
  quoteText: { fontSize: 14, color: colors.textDark, fontStyle: 'italic', marginBottom: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  commentText: { fontSize: 14, color: colors.textGray },
  emptyAnnotations: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { fontSize: 16, color: colors.textGray, marginBottom: spacing.sm },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});