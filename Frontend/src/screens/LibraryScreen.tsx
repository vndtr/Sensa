import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { bookService, Book } from '../services/api';
import { sessionService } from '../services/session';
import BookCard from '../components/BookCard';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';

export default function LibraryScreen({ navigation }: any) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Состояния для модального окна добавления книги
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [selectedCover, setSelectedCover] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // Состояния для модального окна создания сессии
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedBookForSession, setSelectedBookForSession] = useState<Book | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  const loadBooks = async () => {
    try {
      const data = await bookService.getBooks();
      setBooks(data);
    } catch (error: any) {
      console.error('Error loading books:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить книги');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  // Выбор обложки
  const pickCover = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets[0]) {
        setSelectedCover(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking cover:', error);
    }
  };

  // Выбор EPUB файла
  const pickBookFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/epub', '*.epub'],
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        if (!file.name?.toLowerCase().endsWith('.epub')) {
          Alert.alert('Ошибка', 'Пожалуйста, выберите файл в формате EPUB');
          return;
        }
        setSelectedBook(file);
      }
    } catch (error) {
      console.error('Error picking book:', error);
    }
  };

  // Добавление книги
  const handleAddBookSubmit = async () => {
    if (!newBookTitle.trim()) {
      Alert.alert('Ошибка', 'Введите название книги');
      return;
    }
    if (!newBookAuthor.trim()) {
      Alert.alert('Ошибка', 'Введите автора книги');
      return;
    }
    if (!selectedBook) {
      Alert.alert('Ошибка', 'Выберите EPUB файл книги');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', newBookTitle);
      formData.append('author', newBookAuthor);
      
      formData.append('content', {
        uri: selectedBook.uri,
        type: 'application/epub+zip',
        name: selectedBook.name,
      } as any);
      
      if (selectedCover) {
        formData.append('book_cover', {
          uri: selectedCover.uri,
          type: selectedCover.mimeType || 'image/jpeg',
          name: selectedCover.name,
        } as any);
      } else {
        formData.append('book_cover', {
          uri: selectedBook.uri,
          type: 'image/jpeg',
          name: 'default.jpg',
        } as any);
      }

      await bookService.addBook(formData);
      
      setModalVisible(false);
      setNewBookTitle('');
      setNewBookAuthor('');
      setSelectedCover(null);
      setSelectedBook(null);
      
      loadBooks();
      
      Alert.alert('Успешно', 'Книга добавлена в библиотеку');
    } catch (error: any) {
      console.error('Error adding book:', error);
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось добавить книгу');
    } finally {
      setUploading(false);
    }
  };

  // Открытие модального окна для создания сессии
  const handleCreateSessionForBook = (book: Book) => {
    setSelectedBookForSession(book);
    setNewSessionName('');
    setSessionModalVisible(true);
  };

  // Создание сессии
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      Alert.alert('Ошибка', 'Введите название сессии');
      return;
    }
    if (!selectedBookForSession) {
      Alert.alert('Ошибка', 'Книга не выбрана');
      return;
    }

    setCreatingSession(true);
    try {
      const newSession = await sessionService.createSession({
        name: newSessionName,
        book_id: selectedBookForSession.id,
      });
      
      setSessionModalVisible(false);
      setSelectedBookForSession(null);
      setNewSessionName('');
      
      navigation.navigate('SessionReader', {
        sessionId: newSession.id,
        bookId: newSession.book_id,
        bookTitle: selectedBookForSession.title,
        userRole: 'admin',
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать сессию');
    } finally {
      setCreatingSession(false);
    }
  };

  const sortedBooks = [...books].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.title.localeCompare(b.title);
    } else {
      return b.title.localeCompare(a.title);
    }
  });

  const filteredBooks = sortedBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteBook = async (id: number) => {
    Alert.alert('Удалить книгу?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookService.deleteBook(id);
            setBooks(books.filter(b => b.id !== id));
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить книгу');
          }
        }
      }
    ]);
  };

  const handleOpenBook = (bookId: number, bookTitle: string, bookAuthor: string) => {
    navigation.navigate('SoloReader', { 
      bookId: bookId, 
      bookTitle: bookTitle,
      bookAuthor: bookAuthor
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Моя библиотека</Text>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск книг..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortSection}>
        <Text style={styles.sortLabel}>Сортировать:</Text>
        <TouchableOpacity
          style={[styles.sortButton, sortOrder === 'asc' && styles.sortButtonActive]}
          onPress={() => setSortOrder('asc')}
        >
          <Text style={[styles.sortButtonText, sortOrder === 'asc' && styles.sortButtonTextActive]}>
            А → Я
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortOrder === 'desc' && styles.sortButtonActive]}
          onPress={() => setSortOrder('desc')}
        >
          <Text style={[styles.sortButtonText, sortOrder === 'desc' && styles.sortButtonTextActive]}>
            Я → А
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BookCard
            id={item.id}
            title={item.title}
            author={item.author}
            cover={item.cover_img}
            progress={0}
            onPress={() => handleOpenBook(item.id, item.title, item.author)}
            onSession={() => handleCreateSessionForBook(item)}
            onDelete={() => handleDeleteBook(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет книг в библиотеке</Text>
            <Text style={styles.emptySubtext}>Нажмите «+», чтобы добавить</Text>
          </View>
        }
      />

      {/* Модальное окно добавления книги */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавление книги</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Название книги"
              value={newBookTitle}
              onChangeText={setNewBookTitle}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Автор"
              value={newBookAuthor}
              onChangeText={setNewBookAuthor}
            />
            
            <TouchableOpacity style={styles.fileButton} onPress={pickBookFile}>
              <Text style={styles.fileButtonText}>
                {selectedBook ? `📖 ${selectedBook.name}` : '📖 Выбрать EPUB файл'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.fileButton} onPress={pickCover}>
              <Text style={styles.fileButtonText}>
                {selectedCover ? `🖼️ ${selectedCover.name}` : '🖼️ Выбрать обложку (опционально)'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setModalVisible(false);
                  setNewBookTitle('');
                  setNewBookAuthor('');
                  setSelectedCover(null);
                  setSelectedBook(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCreateButton} 
                onPress={handleAddBookSubmit}
                disabled={uploading}
              >
                <Text style={styles.modalCreateButtonText}>
                  {uploading ? 'Загрузка...' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно создания сессии */}
      <Modal
        visible={sessionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Создание сессии</Text>
            
            <View style={styles.selectedBookInfo}>
              <Text style={styles.selectedBookLabel}>Книга:</Text>
              <Text style={styles.selectedBookTitle}>{selectedBookForSession?.title}</Text>
              <Text style={styles.selectedBookAuthor}>{selectedBookForSession?.author}</Text>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Название сессии"
              value={newSessionName}
              onChangeText={setNewSessionName}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setSessionModalVisible(false);
                  setSelectedBookForSession(null);
                  setNewSessionName('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCreateButton} 
                onPress={handleCreateSession}
                disabled={creatingSession}
              >
                <Text style={styles.modalCreateButtonText}>
                  {creatingSession ? 'Создание...' : 'Создать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.textGray,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.textGray,
  },
  sortButtonTextActive: {
    color: colors.white,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textGray,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  fileButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  fileButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.textGray,
  },
  modalCreateButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalCreateButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  selectedBookInfo: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  selectedBookLabel: {
    fontSize: 12,
    color: colors.textGray,
    marginBottom: spacing.xs,
  },
  selectedBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  selectedBookAuthor: {
    fontSize: 14,
    color: colors.textGray,
    marginTop: 2,
  },
});