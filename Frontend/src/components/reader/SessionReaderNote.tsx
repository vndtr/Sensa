import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { commonStyles } from '../../styles/common';

interface Reply {
  id: number;
  content: string;
  author: string;
  authorRole: 'admin' | 'participant';
  createdAt: string;
}

interface SessionReaderNoteProps {
  id: number | string;
  type: 'quote' | 'note';
  text: string;
  comment?: string;
  color: string;
  author: {
    id: number;
    name: string;
    role: 'admin' | 'participant';
  };
  visibility?: 'public' | 'private';
  start_index: number;
  end_index: number;
  currentUserId: number;
  userRole: 'admin' | 'participant';
  replies?: Reply[];
  onDelete: (id: number | string, type: string) => void;
  onEdit?: (id: number | string, type: string, color: string, comment: string, text: string, visibility: string, startIndex: number, endIndex: number) => void;
  onReplyClick?: () => void;
  onNoteClick?: () => void;
  isReplyOpen?: boolean;
  replyText?: string;
  onReplyTextChange?: (text: string) => void;
  onSubmitReply?: () => void;
  onCancelReply?: () => void;
  shouldOpenReplies?: boolean;
}

export default function SessionReaderNote({
  id,
  type,
  text,
  comment,
  color,
  author,
  visibility = 'public',
  start_index,
  end_index,
  currentUserId,
  userRole,
  replies = [],
  onDelete,
  onEdit,
  onReplyClick,
  onNoteClick,
  isReplyOpen = false,
  replyText = '',
  onReplyTextChange,
  onSubmitReply,
  onCancelReply,
  shouldOpenReplies = false,
}: SessionReaderNoteProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [localReplies, setLocalReplies] = useState<Reply[]>(replies);
  const isOwn = author.id === currentUserId;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (shouldOpenReplies && !showReplies) {
      setShowReplies(true);
    }
  }, [shouldOpenReplies]);

  const getColorStyle = () => {
    const colorsMap: Record<string, string> = {
      yellow: '#fef9c3',
      green: '#dcfce7',
      blue: '#dbeafe',
      pink: '#fce7f3',
    };
    if (type === 'note') {
      return { borderLeftColor: colorsMap[color] || colorsMap.yellow, borderLeftWidth: 4 };
    }
    return { backgroundColor: colorsMap[color] || colorsMap.yellow };
  };

  const handleCardClick = () => {
    if (onNoteClick) {
      onNoteClick();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(id, type, color, comment || '', text, visibility, start_index, end_index);
    }
  };

  const handleDelete = () => {
    onDelete(id, type);
  };

  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  // Цитата
  if (type === 'quote') {
    return (
      <TouchableOpacity style={[styles.quoteCard, getColorStyle()]} onPress={handleCardClick} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.quoteBadge}>Цитата</Text>
          {isOwn && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.quoteText}>"{text}"</Text>
      </TouchableOpacity>
    );
  }

  // Заметка
  return (
    <TouchableOpacity style={[styles.noteCard, getColorStyle()]} onPress={handleCardClick} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.authorContainer}>
          <Text style={[styles.authorName, author.role === 'admin' && styles.adminName]}>
            {author.name} {author.role === 'admin' && '👑'}
          </Text>
          {visibility === 'private' && <Text style={styles.privateBadge}>Приватная</Text>}
        </View>
        {isOwn && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
              <Image source={require('../../../assets/edit.png')} style={commonStyles.editIcon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
              <Image source={require('../../../assets/delete.png')} style={commonStyles.iconSmall} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.noteText}>"{text}"</Text>

      {comment && (
        <>
          <View style={styles.divider} />
          <Text style={styles.commentText}>{comment}</Text>
        </>
      )}

      <View style={styles.footerButtons}>
        {visibility === 'public' && (isAdmin || isOwn) && onReplyClick && (
          <TouchableOpacity style={styles.replyButton} onPress={onReplyClick}>
            <Text style={styles.replyButtonText}>💬 Ответить</Text>
          </TouchableOpacity>
        )}

        {localReplies.length > 0 && (
          <TouchableOpacity onPress={toggleReplies} style={styles.showRepliesButton}>
            <Text style={styles.showRepliesButtonText}>
              {showReplies ? 'Скрыть ответы' : `Показать ответы (${localReplies.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Форма ответа */}
      {isReplyOpen && (
        <View style={styles.replyForm}>
          <TextInput
            style={styles.replyInput}
            placeholder="Введите ваш ответ..."
            placeholderTextColor={colors.textLight}
            value={replyText}
            onChangeText={onReplyTextChange}
            multiline
          />
          <View style={styles.replyFormButtons}>
            <TouchableOpacity onPress={onCancelReply} style={styles.replyCancelButton}>
              <Text style={styles.replyCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSubmitReply} style={styles.replySubmitButton}>
              <Text style={styles.replySubmitButtonText}>Отправить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ответы */}
      {showReplies && localReplies.length > 0 && (
        <View style={styles.repliesContainer}>
          {localReplies.map((reply) => (
            <View key={reply.id} style={styles.replyItem}>
              <View style={styles.replyHeader}>
                <Text style={[styles.replyAuthor, reply.authorRole === 'admin' && styles.adminName]}>
                  {reply.author} {reply.authorRole === 'admin' && '👑'}
                </Text>
                <Text style={styles.replyTime}>{reply.createdAt}</Text>
              </View>
              <Text style={styles.replyContent}>{reply.content}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  quoteCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  noteCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    gap: spacing.xs,
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
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  adminName: {
    color: colors.secondary,
  },
  quoteBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  privateBadge: {
    fontSize: 10,
    color: colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textDark,
  },
  noteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textDark,
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
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  replyButton: {
    paddingVertical: spacing.xs,
  },
  replyButtonText: {
    fontSize: 12,
    color: colors.primary,
  },
  showRepliesButton: {
    paddingVertical: spacing.xs,
  },
  showRepliesButtonText: {
    fontSize: 12,
    color: colors.textLight,
  },
  replyForm: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textDark,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  replyCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replyCancelButtonText: {
    color: colors.textGray,
  },
  replySubmitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  replySubmitButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: spacing.sm,
  },
  replyItem: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  replyTime: {
    fontSize: 10,
    color: colors.textLight,
  },
  replyContent: {
    fontSize: 13,
    color: colors.textDark,
  },
});