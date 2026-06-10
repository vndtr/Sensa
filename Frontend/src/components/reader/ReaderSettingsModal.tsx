import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface ReaderSettingsModalProps {
  visible: boolean;
  currentFontSize: number;
  currentBackgroundColor: string;
  onClose: () => void;
  onSave: (fontSize: number, backgroundColor: string) => void;
}

const BACKGROUND_COLORS = [
  { name: 'Светлая', value: '#ffffff', textColor: '#1e293b' },
  { name: 'Бежевая', value: '#f5f0e6', textColor: '#1e293b' },
  { name: 'Тёмная', value: '#1a1a2e', textColor: '#e2e8f0' },
  { name: 'Серая', value: '#2d2d2d', textColor: '#e2e8f0' },
];

const FONT_SIZES = [
  { label: 'Маленький', value: 12 },
  { label: 'Средний', value: 14 },
  { label: 'Большой', value: 16 },
  { label: 'Очень большой', value: 18 },
  { label: 'Огромный', value: 20 },
];

export default function ReaderSettingsModal({
  visible,
  currentFontSize,
  currentBackgroundColor,
  onClose,
  onSave,
}: ReaderSettingsModalProps) {
  const [fontSize, setFontSize] = useState(currentFontSize);
  const [backgroundColor, setBackgroundColor] = useState(currentBackgroundColor);

  useEffect(() => {
    if (visible) {
      setFontSize(currentFontSize);
      setBackgroundColor(currentBackgroundColor);
    }
  }, [visible, currentFontSize, currentBackgroundColor]);

  const handleSave = () => {
    onSave(fontSize, backgroundColor);
    onClose();
  };

  const handleCancel = () => {
    setFontSize(currentFontSize);
    setBackgroundColor(currentBackgroundColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Настройки читалки</Text>

          {/* Размер шрифта */}
          <Text style={styles.label}>Размер шрифта: {fontSize}px</Text>
          <Slider
            style={styles.slider}
            minimumValue={12}
            maximumValue={24}
            step={1}
            value={fontSize}
            onValueChange={setFontSize}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          
          <View style={styles.fontSizeButtons}>
            {FONT_SIZES.map((size) => (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.fontSizeButton,
                  fontSize === size.value && styles.fontSizeButtonActive,
                ]}
                onPress={() => setFontSize(size.value)}
              >
                <Text
                  style={[
                    styles.fontSizeButtonText,
                    fontSize === size.value && styles.fontSizeButtonTextActive,
                  ]}
                >
                  {size.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Фон */}
          <Text style={styles.label}>Цвет фона</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            <View style={styles.colorRow}>
              {BACKGROUND_COLORS.map((bg) => (
                <TouchableOpacity
                  key={bg.value}
                  style={[
                    styles.colorOption,
                    { backgroundColor: bg.value },
                    backgroundColor === bg.value && styles.colorOptionActive,
                  ]}
                  onPress={() => setBackgroundColor(bg.value)}
                >
                  <Text style={[styles.colorOptionText, { color: bg.textColor }]}>
                    {bg.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Кнопки */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Сохранить</Text>
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
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: spacing.md,
  },
  fontSizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  fontSizeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  fontSizeButtonActive: {
    backgroundColor: colors.primary,
  },
  fontSizeButtonText: {
    fontSize: 12,
    color: colors.textGray,
  },
  fontSizeButtonTextActive: {
    color: colors.white,
  },
  colorScroll: {
    marginBottom: spacing.lg,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorOption: {
    width: 80,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: colors.primary,
    transform: [{ scale: 1.02 }],
  },
  colorOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttons: {
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
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
});