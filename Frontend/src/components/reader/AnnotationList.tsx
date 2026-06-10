import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { commonStyles } from '../../styles/common';

interface Annotation {
  id: string;
  type: 'quote' | 'note';
  text: string;
  comment?: string;
  color: string;
  startIndex: number;
  endIndex: number;
}

interface AnnotationListProps {
  annotations: Annotation[];
  onAnnotationPress: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onEditAnnotation?: (annotation: Annotation) => void;
}

export default function AnnotationList({ 
  annotations, 
  onAnnotationPress, 
  onDeleteAnnotation, 
  onEditAnnotation 
}: AnnotationListProps) {
  const renderItem = ({ item }: { item: Annotation }) => (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
      onPress={() => onAnnotationPress(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{item.type === 'quote' ? 'Цитата' : 'Заметка'}</Text>
        <View style={styles.actions}>
          {item.type === 'note' && onEditAnnotation && (
            <TouchableOpacity onPress={() => onEditAnnotation(item)} style={styles.actionButton}>
              <Image source={require('../../../assets/edit.png')} style={commonStyles.editIcon} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDeleteAnnotation(item.id)} style={styles.actionButton}>
            <Image source={require('../../../assets/delete.png')} style={commonStyles.deleteIcon} />
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
  );

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Мои аннотации</Text>
      
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
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  type: {
    fontSize: 12,
    color: colors.textGray,
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
    marginVertical: spacing.sm,
  },
  commentText: {
    fontSize: 14,
    color: colors.textGray,
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