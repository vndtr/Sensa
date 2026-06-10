import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { commonStyles } from '../../styles/common';


export interface SessionAnnotation {
  id: string;
  type: 'quote' | 'note';
  text: string;
  comment?: string;
  color: string;
  startIndex: number;
  endIndex: number;
  author: string;
  authorRole: 'admin' | 'participant';
  isPrivate?: boolean;
  replies?: any[];
}

interface SessionAnnotationListProps {
  annotations: SessionAnnotation[];
  currentUserId: number;
  userRole: 'admin' | 'participant';
  onAnnotationPress: (annotation: SessionAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onEditAnnotation?: (annotation: SessionAnnotation) => void;
  onReplyClick?: (annotation: SessionAnnotation) => void;
}

export default function SessionAnnotationList({ 
  annotations, 
  currentUserId,
  userRole,
  onAnnotationPress, 
  onDeleteAnnotation, 
  onEditAnnotation,
  onReplyClick
}: SessionAnnotationListProps) {
  const renderItem = ({ item }: { item: SessionAnnotation }) => {
    const isOwn = item.author === 'Текущий пользователь'; 
    const isAdmin = userRole === 'admin';
    const isQuote = item.type === 'quote';

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
        onPress={() => onAnnotationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.authorContainer}>
            <Text style={[styles.authorName, item.authorRole === 'admin' && styles.adminName]}>
              {item.author} {item.authorRole === 'admin' && '👑'}
            </Text>
            {!isQuote && isOwn && (
              <Text style={styles.visibilityBadge}>
                {item.isPrivate ? 'Приватная' : 'Публичная'}
              </Text>
            )}
          </View>
          
          <View style={styles.actions}>
            {!isQuote && isOwn && onEditAnnotation && (
              <TouchableOpacity onPress={() => onEditAnnotation(item)} style={styles.actionButton}>
                <Image source={require('../../../assets/edit.png')} style={commonStyles.editIcon} />
              </TouchableOpacity>
            )}
            {isOwn && (
              <TouchableOpacity onPress={() => onDeleteAnnotation(item.id)} style={styles.actionButton}>
                <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.quoteText}>"{item.text}"</Text>
        
        {!isQuote && item.comment && (
          <>
            <View style={styles.divider} />
            <Text style={styles.commentText}>{item.comment}</Text>
          </>
        )}
        
        {/* Кнопка ответа только для публичных заметок не-админов */}
        {!isQuote && !item.isPrivate && (isAdmin || isOwn) && onReplyClick && (
          <TouchableOpacity style={styles.replyButton} onPress={() => onReplyClick(item)}>
            <Text style={styles.replyButtonText}>💬 Ответить</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {annotations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Нет аннотаций</Text>
          <Text style={styles.emptySubtext}>Выделите текст, чтобы создать цитату или заметку</Text>
        </View>
      ) : (
        <FlatList
          data={annotations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  adminName: {
    color: colors.secondary,
  },
  visibilityBadge: {
    fontSize: 10,
    color: colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionText: {
    fontSize: 14,
  },
  quoteText: {
    fontSize: 14,
    color: colors.textDark,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  commentText: {
    fontSize: 14,
    color: colors.textGray,
  },
  replyButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  replyButtonText: {
    fontSize: 12,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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