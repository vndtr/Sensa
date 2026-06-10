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
import SessionNoteModal from '../../components/reader/SessionNoteModal';
import ParticipantsModal from '../../components/reader/ParticipantsModal';
import ReaderSettingsModal from '../../components/reader/ReaderSettingsModal';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { sessionService, Session } from '../../services/session';
import { bookService, Book } from '../../services/book';
import { sessionNoteService, SessionNote, SessionNoteCreate } from '../../services/sessionNote';
import { sessionQuoteService, SessionQuote, SessionQuoteCreate } from '../../services/sessionQuote';
import { answerService, Answer } from '../../services/answer';
import { useAuthStore } from '../../store/authStore';
import { websocketService } from '../../services/websocket';
import { commonStyles } from '../../styles/common';
interface Annotation {
  id: number;
  type: 'quote' | 'note';
  text: string;
  comment?: string;
  color: string;
  startIndex: number;
  endIndex: number;
  authorId?: number;
  authorName?: string;
  authorRole?: 'admin' | 'participant';
  isPrivate?: boolean;
  createdAt?: string;
  replies?: Answer[];
}

interface HighlightData {
  type: 'highlight' | 'underline';
  color: string;
  start: number;
  end: number;
}

const CHUNK_SIZE = 3000;

export default function SessionReader() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId, bookId, bookTitle: initialBookTitle, userRole: initialUserRole } = route.params as any;
  const { user, updateProfile } = useAuthStore();

  const bookTextRef = useRef<BookTextRef>(null);

  // Состояние сессии
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [bookInfo, setBookInfo] = useState<Book | null>(null);
  const [fullBookText, setFullBookText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [userRole, setUserRole] = useState(initialUserRole || 'participant');
  const [participants, setParticipants] = useState<any[]>([]);

  // Аннотации
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
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

  // Ответы
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingToNote, setReplyingToNote] = useState<Annotation | null>(null);
  const [replyText, setReplyText] = useState('');

  const [wsConnected, setWsConnected] = useState(false);

  // Фильтры
  const [filterType, setFilterType] = useState<'all' | 'note' | 'quote'>('all');

  // Настройки из профиля пользователя
  const currentFontSize = user?.font_size || 16;
  const currentBackgroundColor = user?.background_color || '#ffffff';

  // Обработчик WebSocket сообщений
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('WebSocket message received:', message);
    
    // При получении уведомления перезагружаем аннотации
    if (message.type === 'note_created' || 
        message.type === 'note_updated' || 
        message.type === 'note_deleted' ||
        message.type === 'answer_created' ||
        message.type === 'answer_updated' ||
        message.type === 'answer_deleted' ||
        message.type === 'role_changed') {
      loadAnnotations();
    }
  }, []);

  // Подключение к WebSocket при загрузке сессии
  useEffect(() => {
    if (sessionId && !loading) {
      websocketService.connect(sessionId, {
        onConnect: () => {
          console.log('WebSocket connected to session', sessionId);
          setWsConnected(true);
        },
        onDisconnect: () => {
          console.log('WebSocket disconnected from session', sessionId);
          setWsConnected(false);
        },
        onMessage: handleWebSocketMessage,
        onError: (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        },
      });
    }
    
    // Отключение при выходе из сессии
    return () => {
      websocketService.disconnect();
      setWsConnected(false);
    };
  }, [sessionId, loading, handleWebSocketMessage]);

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

  // Загрузка данных сессии
  const loadSessionData = async () => {
    try {
      setLoading(true);

      const session = await sessionService.getSession(sessionId);
      setSessionInfo(session);

      const book = await bookService.getBook(session.book_id);
      setBookInfo(book);

      await loadFullBookContent(book.content_path);
      await loadAnnotations();

      const participantsList = await sessionService.getParticipants(sessionId);
      setParticipants(participantsList);

      const currentParticipant = participantsList.find((p: any) => p.user_id === user?.id);
      if (currentParticipant) {
        setUserRole(currentParticipant.role_id === 2 ? 'admin' : 'participant');
      }

      const progress = await sessionService.getProgress(sessionId);
      setCurrentPage(progress.last_page || 0);

    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить сессию');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Загрузка аннотаций
  const loadAnnotations = async () => {
  try {
    const [notes, quotes] = await Promise.all([
      sessionNoteService.getNotes(sessionId),
      sessionQuoteService.getQuotes(sessionId),
    ]);

    console.log('=== ЗАГРУЗКА АННОТАЦИЙ ===');
    console.log('sessionId:', sessionId);
    console.log('user?.id:', user?.id);
    console.log('notes count:', notes.length);
    console.log('quotes count:', quotes.length);
    
    if (notes.length > 0) {
      console.log('Первый note:', JSON.stringify(notes[0], null, 2));
    }
    if (quotes.length > 0) {
      console.log('Первый quote:', JSON.stringify(quotes[0], null, 2));
    }

    const formattedNotes: Annotation[] = notes.map((note: any) => {
      const authorId = note.author?.id || note.participant_id;
      console.log('Note id:', note.id, 'authorId:', authorId, 'current user:', user?.id);
      
      return {
        id: note.id,
        type: 'note',
        text: note.selected_text,
        comment: note.comment,
        color: note.color,
        startIndex: note.start_index,
        endIndex: note.end_index,
        isPrivate: note.is_private,
        createdAt: note.created_at,
        authorId: note.author_id || note.participant_id,  
        authorName: note.author_name || 'Пользователь',   
        authorRole: note.author_role === 'teacher' ? 'admin' : 'participant',
      };
    });

    const formattedQuotes: Annotation[] = quotes.map((quote: any) => {
      const authorId = quote.author?.id || quote.participant_id;
      return {
        id: quote.id,
        type: 'quote',
        text: quote.selected_text,
        color: quote.color,
        startIndex: quote.start_index,
        endIndex: quote.end_index,
        createdAt: quote.created_at,
        authorId: quote.author_id || quote.participant_id, 
        authorName: quote.author_name || 'Пользователь',   
        authorRole: quote.author_role === 'teacher' ? 'admin' : 'participant',
      };
    });

    console.log('formattedNotes count:', formattedNotes.length);
    console.log('formattedQuotes count:', formattedQuotes.length);
    
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

  // Фильтрация аннотаций по правилам видимости
  const visibleAnnotations = annotations.filter(ann => {
    // Цитаты: видны только автору
    if (ann.type === 'quote') {
      return true;
    }
    
    // Заметки
    if (ann.type === 'note') {
      // Приватные: видны только автору
      if (ann.isPrivate) {
        return ann.authorId === user?.id;
      }
      // Публичные: видны админу (если автор участник) или всем (если автор админ)
      // Но по условию — всем, кто может видеть, с серым подчёркиванием
      if (ann.authorRole === 'participant') {
        return userRole === 'admin';
      }
      // Публичная заметка админа — видна всем
      return true;
    }
    
    return false;
  });
  
  const pageAnnotations = visibleAnnotations.filter(ann => {
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
    
    // Определяем цвет выделения
    let displayColor = ann.color;
    const isOwn = ann.authorId === user?.id;
    
    if (ann.type === 'quote') {
      // Цитаты: только автор видит цветным фоном
      displayColor = ann.color;
    } else if (ann.type === 'note') {
      if (isOwn) {
        // Свои заметки — цветным подчёркиванием
        displayColor = ann.color;
      } else {
        // Чужие публичные заметки — серым подчёркиванием
        displayColor = 'gray';
      }
    }
    
    const highlightType: 'highlight' | 'underline' = ann.type === 'quote' ? 'highlight' : 'underline';
    
    return {
      type: highlightType,
      color: displayColor,
      start: start,
      end: end,
    };
  }).filter((hl): hl is HighlightData => hl.start < hl.end && hl.start >= 0 && hl.end <= CHUNK_SIZE);

  if (highlights.length > 0) {
    setTimeout(() => {
      bookTextRef.current?.applyAllHighlights(highlights);
    }, 300);
  }
}, [currentPage, annotations, fullBookText, user?.id, userRole]);
    
  useEffect(() => {
    if (!loading && fullBookText) {
      applyHighlightsToCurrentPage();
    }
  }, [currentPage, loading, fullBookText, applyHighlightsToCurrentPage]);

  useFocusEffect(
    useCallback(() => {
      loadSessionData();
    }, [sessionId])
  );

  const saveProgress = async (page: number) => {
    try {
      await sessionService.updateProgress(sessionId, page);
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
    try {
      const newQuote: SessionQuoteCreate = {
        selected_text: selectedText,
        color: color,
        start_index: selectedStartIndex,
        end_index: selectedEndIndex,
        session_id: sessionId,
      };

      const quote = await sessionQuoteService.createQuote(newQuote);

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

      // Отправляем уведомление через WebSocket
      websocketService.sendMessage({
        type: 'quote_created',
        data: { quoteId: quote.id, sessionId: sessionId }
      });

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

  const handleSaveNote = async (comment: string, color: string, isPrivate: boolean) => {
    try {
      const newNote: SessionNoteCreate = {
        selected_text: selectedText,
        color: color,
        is_private: isPrivate,
        comment: comment,
        start_index: selectedStartIndex,
        end_index: selectedEndIndex,
        session_id: sessionId,
      };

      const note = await sessionNoteService.createNote(newNote);

      const annotation: Annotation = {
        id: note.id,
        type: 'note',
        text: note.selected_text,
        comment: note.comment,
        color: note.color,
        startIndex: note.start_index,
        endIndex: note.end_index,
        isPrivate: note.is_private,
        createdAt: note.created_at,
      };

      setAnnotations(prev => [annotation, ...prev]);
      
      const pageStart = currentPage * CHUNK_SIZE;
      const localStart = selectedStartIndex - pageStart;
      const localEnd = selectedEndIndex - pageStart;
      bookTextRef.current?.applyUnderline(color, localStart, localEnd);

      // Отправляем уведомление через WebSocket
      websocketService.sendMessage({
        type: 'note_created',
        data: { noteId: note.id, sessionId: sessionId }
      });

    } catch (error) {
      console.error('Error creating note:', error);
      Alert.alert('Ошибка', 'Не удалось создать заметку');
    } finally {
      setNoteModalVisible(false);
      setSelectedText('');
    }
  };

  const handleUpdateNote = async (comment: string, color: string, isPrivate: boolean) => {
    if (!editingNote) return;

    try {
      await sessionNoteService.updateNote({
        id: editingNote.id,
        session_id: sessionId,
        comment,
        color,
        is_private: isPrivate,
      });

      setAnnotations(prev => prev.map(a =>
        a.id === editingNote.id
          ? { ...a, comment, color, isPrivate }
          : a
      ));

      applyHighlightsToCurrentPage();

      // Отправляем уведомление через WebSocket
      websocketService.sendMessage({
        type: 'note_updated',
        data: { noteId: editingNote.id, sessionId: sessionId }
      });

    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Ошибка', 'Не удалось обновить заметку');
    } finally {
      setEditModalVisible(false);
      setEditingNote(null);
    }
  };

  const handleDeleteAnnotation = async (id: number, type: string) => {
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
                await sessionNoteService.deleteNote(id, sessionId);
              } else {
                await sessionQuoteService.deleteQuote(id, sessionId);
              }
              setAnnotations(prev => prev.filter(a => a.id !== id));
              setTimeout(() => applyHighlightsToCurrentPage(), 100);

              // Отправляем уведомление через WebSocket
              websocketService.sendMessage({
                type: type === 'note' ? 'note_deleted' : 'quote_deleted',
                data: { id: id, sessionId: sessionId }
              });

            } catch (error) {
              console.error('Error deleting annotation:', error);
              Alert.alert('Ошибка', 'Не удалось удалить');
            }
          },
        },
      ]
    );
  };

  const handleReplyClick = (note: Annotation) => {
    setReplyingToNote(note);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !replyingToNote) return;

    try {
      const answer = await answerService.createAnswer({
        content: replyText,
        note_id: replyingToNote.id,
        session_id: sessionId,
      });

      setAnnotations(prev => prev.map(a =>
        a.id === replyingToNote.id
          ? { ...a, replies: [...(a.replies || []), answer] }
          : a
      ));

      setReplyModalVisible(false);
      setReplyingToNote(null);
      setReplyText('');

      // Отправляем уведомление через WebSocket
      websocketService.sendMessage({
        type: 'answer_created',
        data: { answerId: answer.id, noteId: replyingToNote.id, sessionId: sessionId }
      });

    } catch (error) {
      console.error('Error submitting reply:', error);
      Alert.alert('Ошибка', 'Не удалось отправить ответ');
    }
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

  const handleLeaveSession = () => {
    Alert.alert(
      'Выход из сессии',
      sessionInfo?.user_id === user?.id
        ? 'Вы являетесь создателем сессии. При выходе сессия будет удалена для всех участников. Продолжить?'
        : 'Вы уверены, что хотите покинуть сессию?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionService.leaveSession(sessionId);
              navigation.goBack();
            } catch (error) {
              console.error('Error leaving session:', error);
              Alert.alert('Ошибка', 'Не удалось выйти из сессии');
            }
          },
        },
      ]
    );
  };

  const filteredAnnotations = annotations.filter(ann => {
  // Фильтр по типу
  if (filterType !== 'all' && ann.type !== filterType) return false;
  
  // Цитаты: видны только автору
  if (ann.type === 'quote') {
    return true;
  }
  
  // Заметки
  if (ann.type === 'note') {
    // Приватные: видны только автору
    if (ann.isPrivate) {
      return ann.authorId === user?.id;
    }
    // Публичные заметки участника — видны только админу
    if (ann.authorRole === 'participant') {
      return userRole === 'admin';
    }
    // Публичные заметки админа — видны всем
    return true;
  }
  
  return false;
});

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загрузка сессии...</Text>
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

        <Text style={styles.title} numberOfLines={1}>
          {bookInfo?.title || initialBookTitle}
        </Text>

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
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setShowParticipantsModal(true);
            }}
          >
            <Text style={styles.menuItemText}>Участники</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLeaveSession}>
            <Text style={styles.menuItemText}>Выйти из сессии</Text>
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
            <Text style={styles.panelTitle}>Аннотации сессии</Text>
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
                      {item.type === 'note' && item.authorId === user?.id && (
                        <>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingNote(item);
                              setEditModalVisible(true);
                            }}
                          >
                            <Image source={require('../../../assets/edit.png')} style={commonStyles.editIcon} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteAnnotation(item.id, item.type)}>
                            <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
                          </TouchableOpacity>
                        </>
                      )}
                      {item.type === 'quote' && (
                        <TouchableOpacity onPress={() => handleDeleteAnnotation(item.id, item.type)}>
                          <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={styles.authorName}>
                    {item.authorName} {item.authorRole === 'admin' && '👑'}
                    {item.isPrivate && <Text style={styles.privateBadge}> 🔒 Приватная</Text>}
                  </Text>

                  <Text style={styles.quoteText}>"{item.text}"</Text>

                  {item.type === 'note' && item.comment && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.commentText}>{item.comment}</Text>
                    </>
                  )}

                  {item.type === 'note' && !item.isPrivate && userRole === 'admin' && item.authorId !== user?.id && (
                    <TouchableOpacity style={styles.replyButton} onPress={() => handleReplyClick(item)}>
                      <Text style={styles.replyButtonText}>💬 Ответить</Text>
                    </TouchableOpacity>
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
      <SessionNoteModal
        visible={noteModalVisible}
        selectedText={selectedText}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedText('');
        }}
        onSave={handleSaveNote}
      />

      {/* Модалка редактирования заметки */}
      <SessionNoteModal
        visible={editModalVisible}
        selectedText={editingNote?.text || ''}
        initialComment={editingNote?.comment}
        initialColor={editingNote?.color}
        initialIsPrivate={editingNote?.isPrivate}
        onClose={() => {
          setEditModalVisible(false);
          setEditingNote(null);
        }}
        onSave={handleUpdateNote}
        isEdit={true}
      />

      {/* Модалка ответа */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ответ на заметку</Text>
            <Text style={styles.modalQuote}>"{replyingToNote?.text}"</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Ваш ответ..."
              placeholderTextColor={colors.textLight}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReplyModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !replyText.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmitReply}
                disabled={!replyText.trim()}
              >
                <Text style={styles.submitButtonText}>Отправить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка участников */}
      <ParticipantsModal
        visible={showParticipantsModal}
        sessionId={sessionId}
        currentUserId={user?.id || 0}
        onClose={() => setShowParticipantsModal(false)}
        isAdmin={userRole === 'admin'}
        onRoleChange={async (userId, newRoleId) => {
          try {
            await sessionService.changeRole(sessionId, userId, newRoleId);
            const updatedParticipants = await sessionService.getParticipants(sessionId);
            setParticipants(updatedParticipants);
          } catch (error) {
            console.error('Error changing role:', error);
            Alert.alert('Ошибка', 'Не удалось изменить роль');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.textGray },
  wsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  wsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  wsConnected: {
    backgroundColor: '#22c55e',
  },
  wsDisconnected: {
    backgroundColor: '#ef4444',
  },
  wsText: {
    fontSize: 10,
    color: colors.textLight,
  },
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
  title: { fontSize: 18, fontWeight: '600', color: colors.textDark, flex: 1, textAlign: 'center' },
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
  modeBadge: { backgroundColor: colors.secondary + '20', paddingVertical: spacing.xs, alignItems: 'center' },
  modeText: { fontSize: 12, color: colors.secondary },
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
    height: '60%',
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
  authorName: { fontSize: 11, color: colors.primary, marginBottom: spacing.xs },
  privateBadge: { fontSize: 10, color: colors.textLight },
  quoteText: { fontSize: 14, color: colors.textDark, fontStyle: 'italic', marginBottom: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  commentText: { fontSize: 14, color: colors.textGray },
  replyButton: { marginTop: spacing.xs, paddingVertical: spacing.xs },
  replyButtonText: { fontSize: 12, color: colors.primary },
  emptyAnnotations: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { fontSize: 16, color: colors.textGray, marginBottom: spacing.sm },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
  modalQuote: { fontSize: 14, fontStyle: 'italic', color: colors.textGray, padding: spacing.sm, backgroundColor: colors.background, borderRadius: 8 },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cancelButtonText: { color: colors.textGray },
  submitButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontWeight: '500' },
});