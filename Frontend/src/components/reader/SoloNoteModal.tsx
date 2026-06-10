import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface SoloNoteModalProps {
  visible: boolean;
  selectedText: string;
  initialComment?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (comment: string, color: string) => void;
  isEdit?: boolean;
}

const COLORS = [
  { name: 'yellow', color: '#fde047', label: 'Жёлтый' },
  { name: 'green', color: '#86efac', label: 'Зелёный' },
  { name: 'blue', color: '#7dd3fc', label: 'Синий' },
  { name: 'pink', color: '#f9a8d4', label: 'Розовый' },
];

export default function SoloNoteModal({ 
  visible, 
  selectedText, 
  initialComment = '', 
  initialColor = 'yellow',
  onClose, 
  onSave,
  isEdit = false
}: SoloNoteModalProps) {
  const [comment, setComment] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  useEffect(() => {
    if (visible) {
      setComment(initialComment);
      setSelectedColor(initialColor);
    }
  }, [visible, initialComment, initialColor]);

  const handleSave = () => {
    if (comment.trim()) {
      onSave(comment, selectedColor);
      setComment('');
      setSelectedColor('yellow');
      onClose();
    }
  };

  const handleClose = () => {
    setComment('');
    setSelectedColor('yellow');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{isEdit ? 'Редактирование заметки' : 'Новая заметка'}</Text>
          
          <View style={styles.selectedTextContainer}>
            <Text style={styles.selectedTextLabel}>Выделенный текст:</Text>
            <Text style={styles.selectedText}>"{selectedText}"</Text>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Ваш комментарий..."
            placeholderTextColor={colors.textLight}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            autoFocus={true}
          />
          
          <Text style={styles.colorLabel}>Цвет подчёркивания:</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.color },
                  selectedColor === c.name && styles.colorCircleSelected,
                ]}
                onPress={() => setSelectedColor(c.name)}
              />
            ))}
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, !comment.trim() && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!comment.trim()}
            >
              <Text style={styles.saveButtonText}>{isEdit ? 'Сохранить' : 'Создать'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  selectedTextContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  selectedTextLabel: {
    fontSize: 12,
    color: colors.textGray,
    marginBottom: spacing.xs,
  },
  selectedText: {
    fontSize: 14,
    color: colors.textDark,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  colorLabel: {
    fontSize: 14,
    color: colors.textGray,
    marginBottom: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorCircleSelected: {
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
    borderWidth: 3,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textGray,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});