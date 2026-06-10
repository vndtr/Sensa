import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import { commonStyles } from '../styles/common';


interface BookCardProps {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  progress: number;
  onPress: () => void;
  onSession: () => void;
  onDelete: () => void;
}

export default function BookCard({ title, author, cover, progress, onPress, onSession, onDelete }: BookCardProps) {
  return (
    <View style={[commonStyles.card, styles.card]}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverText}>📖</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.author}>{author}</Text>
        
        <View style={styles.progressContainer}>
          <View style={commonStyles.progressBar}>
            <View style={[commonStyles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
        
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.button, styles.openButton]} onPress={onPress}>
            <Text style={styles.buttonText}>Открыть</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.sessionButton]} onPress={onSession}>
            <Text style={styles.buttonText}>Сессия</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
          <Image source={require('../../assets/delete.png')} style={commonStyles.deleteIcon} />
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cover: {
    width: 80,
    height: 110,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  coverPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textDark,
    marginBottom: 4,
  },
  author: {
    fontSize: typography.caption.fontSize,
    color: colors.textGray,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: typography.caption.fontSize,
    color: colors.textGray,
    marginLeft: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  openButton: {
    backgroundColor: colors.primary,
  },
  sessionButton: {
    backgroundColor: colors.secondary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
});