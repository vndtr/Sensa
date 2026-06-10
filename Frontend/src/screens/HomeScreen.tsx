import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { sessionService, Session, bookService, Book } from '../services/api';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import { commonStyles } from '../styles/common';

export default function HomeScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [sessionsData, booksData] = await Promise.all([
        sessionService.getSessions(),
        bookService.getBooks(),
      ]);
      setSessions(sessionsData);
      setBooks(booksData);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const lastBook = books.length > 0 ? books[0] : null;
  const recentSessions = sessions.slice(0, 3);

  // Функция для открытия книги
  const handleOpenBook = (bookId: number, bookTitle: string, bookAuthor: string) => {
    navigation.navigate('SoloReader', {
      bookId: bookId,
      bookTitle: bookTitle,
      bookAuthor: bookAuthor,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск книг и сессий"
            placeholderTextColor={colors.textLight}
          />
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Image source={require('../../assets/bell.png')} style={commonStyles.iconMedium} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {lastBook && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Продолжить чтение</Text>
            </View>
            <View style={[commonStyles.card, styles.continueCard]}>
              {lastBook.cover_img ? (
                <Image
                  source={{ uri: `http://192.168.31.224:5000/books/cover/${lastBook.cover_img}` }}
                  style={styles.bookCover}
                />
              ) : (
                <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                  <Text style={styles.bookCoverText}>📖</Text>
                </View>
              )}
              <View style={styles.continueCardContent}>
                <Text style={styles.bookTitle}>{lastBook.title}</Text>
                <Text style={styles.bookAuthor}>{lastBook.author}</Text>
                <TouchableOpacity
                  style={commonStyles.buttonPrimary}
                  onPress={() => handleOpenBook(lastBook.id, lastBook.title, lastBook.author)}
                >
                  <Text style={commonStyles.buttonPrimaryText}>Продолжить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Недавние сессии</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Сессии')}>
            <Text style={styles.viewAllLink}>Смотреть все →</Text>
          </TouchableOpacity>
        </View>

        {recentSessions.map((session) => {
          const book = books.find(b => b.id === session.book_id);
          return (
            <TouchableOpacity
              key={session.id}
              style={[commonStyles.card, styles.sessionCard]}
              onPress={() => navigation.navigate('SessionReader', {
                sessionId: session.id,
                bookId: session.book_id,
                bookTitle: book?.title,
                userRole: 'participant',
              })}
            >
              <View style={[styles.bookCoverSmall, styles.bookCoverPlaceholder]}>
                <Text style={styles.bookCoverText}>📖</Text>
              </View>
              <View style={styles.sessionCardContent}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <Text style={styles.sessionBookInfo}>
                  {book?.title || 'Книга'} — {book?.author || 'Автор'}
                </Text>
                <Text style={styles.sessionMembers}>Активна</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {recentSessions.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет активных сессий</Text>
            <Text style={styles.emptySubtext}>Создайте сессию в разделе "Сессии"</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationButton: {
    marginLeft: spacing.md,
    padding: spacing.sm,
  },
  notificationIcon: {
    fontSize: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: typography.subtitle.fontWeight,
    color: colors.textDark,
  },
  viewAllLink: {
    fontSize: 14,
    color: colors.primary,
  },
  continueCard: {
    flexDirection: 'row',
  },
  bookCover: {
    width: 90,
    height: 120,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  bookCoverSmall: {
    width: 60,
    height: 80,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  bookCoverPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCoverText: {
    fontSize: 32,
  },
  continueCardContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textDark,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: typography.caption.fontSize,
    color: colors.textGray,
    marginBottom: spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
  },
  sessionCardContent: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  sessionBookInfo: {
    fontSize: typography.caption.fontSize,
    color: colors.textGray,
    marginBottom: 4,
  },
  sessionMembers: {
    fontSize: 11,
    color: colors.textLight,
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
    textAlign: 'center',
  },
});