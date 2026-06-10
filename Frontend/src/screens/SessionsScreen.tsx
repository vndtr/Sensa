import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { sessionService, Session } from '../services/session';
import { bookService, Book } from '../services/book';
import { useAuthStore } from '../store/authStore';

interface SessionWithBook extends Session {
  book?: Book;
}

export default function SessionsScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<SessionWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const { user } = useAuthStore();

  // Загрузка сессий с информацией о книгах
  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsData = await sessionService.getSessions();
      
      // Загружаем информацию о книгах для каждой сессии
      const sessionsWithBooks = await Promise.all(
        sessionsData.map(async (session) => {
          try {
            const book = await bookService.getBook(session.book_id);
            return { ...session, book };
          } catch (error) {
            console.error(`Error loading book for session ${session.id}:`, error);
            return { ...session, book: undefined };
          }
        })
      );
      
      setSessions(sessionsWithBooks);
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить сессии');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Загрузка книг для создания сессии
  const loadBooks = async () => {
    setLoadingBooks(true);
    try {
      const books = await bookService.getUserBooks();
      setAvailableBooks(books);
    } catch (error) {
      console.error('Error loading books:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить книги');
    } finally {
      setLoadingBooks(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      Alert.alert('Ошибка', 'Введите название сессии');
      return;
    }
    if (!selectedBookId) {
      Alert.alert('Ошибка', 'Выберите книгу');
      return;
    }

    setCreatingSession(true);
    try {
      const newSession = await sessionService.createSession({
        name: newSessionName,
        book_id: selectedBookId,
      });
      
      // Находим книгу для перехода
      const book = availableBooks.find(b => b.id === selectedBookId);
      
      setModalVisible(false);
      setNewSessionName('');
      setSelectedBookId(null);
      
      // Обновляем список сессий
      await loadSessions();
      
      // Переходим в созданную сессию
      navigation.navigate('SessionReader', {
        sessionId: newSession.id,
        bookId: newSession.book_id,
        bookTitle: book?.title,
        userRole: 'admin',
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать сессию');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleJoinSession = (session: SessionWithBook) => {
    navigation.navigate('SessionReader', {
      sessionId: session.id,
      bookId: session.book_id,
      bookTitle: session.book?.title,
      userRole: 'participant',
    });
  };

  const renderSessionCard = ({ item }: { item: SessionWithBook }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleJoinSession(item)}
    >
      <View style={styles.coverPlaceholder}>
        <Text style={styles.coverText}>📖</Text>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <Text style={styles.bookInfo}>
          {item.book?.title || 'Книга'} — {item.book?.author || 'Автор'}
        </Text>
        <Text style={styles.linkInfo}>🔗 Ссылка: {item.link}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загрузка сессий...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Сессии</Text>
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => {
            loadBooks();
            setModalVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Создать</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSessionCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет активных сессий</Text>
            <Text style={styles.emptySubtext}>Нажмите «+ Создать», чтобы начать</Text>
          </View>
        }
      />

      {/* Модальное окно создания сессии */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Создание сессии</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Название сессии"
              placeholderTextColor={colors.textLight}
              value={newSessionName}
              onChangeText={setNewSessionName}
              autoFocus
            />
            
            <Text style={styles.label}>Выберите книгу:</Text>
            
            {loadingBooks ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.booksLoader} />
            ) : (
              <FlatList
                data={availableBooks}
                keyExtractor={(item) => item.id.toString()}
                style={styles.bookList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.bookOption,
                      selectedBookId === item.id && styles.bookOptionSelected
                    ]}
                    onPress={() => setSelectedBookId(item.id)}
                  >
                    <Text style={styles.bookOptionTitle}>{item.title}</Text>
                    <Text style={styles.bookOptionAuthor}>{item.author}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyBooksText}>
                    Нет книг в библиотеке. Сначала добавьте книги.
                  </Text>
                }
              />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setModalVisible(false);
                  setNewSessionName('');
                  setSelectedBookId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, (!newSessionName.trim() || !selectedBookId) && styles.submitButtonDisabled]} 
                onPress={handleCreateSession}
                disabled={!newSessionName.trim() || !selectedBookId || creatingSession}
              >
                <Text style={styles.submitButtonText}>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  createButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
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
  coverPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  bookInfo: {
    fontSize: 14,
    color: colors.textGray,
  },
  linkInfo: {
    fontSize: 11,
    color: colors.textLight,
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
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  booksLoader: {
    padding: spacing.lg,
  },
  bookList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  bookOption: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  bookOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  bookOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
  },
  bookOptionAuthor: {
    fontSize: 12,
    color: colors.textGray,
  },
  emptyBooksText: {
    textAlign: 'center',
    color: colors.textGray,
    padding: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textGray,
  },
  submitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
});