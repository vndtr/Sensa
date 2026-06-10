import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface SelectionMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onSelectColor: (color: string) => void;
  onNote: () => void;
  onClose: () => void;
}

const COLORS = [
  { name: 'yellow', color: '#fde047', label: 'Жёлтый' },
  { name: 'green', color: '#86efac', label: 'Зелёный' },
  { name: 'blue', color: '#7dd3fc', label: 'Синий' },
  { name: 'pink', color: '#f9a8d4', label: 'Розовый' },
];

export default function SelectionMenu({ visible, position, onSelectColor, onNote, onClose }: SelectionMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { top: position.y - 60, left: position.x - 150 }]}>
          {/* Цветные кружочки для цитат */}
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.colorCircle, { backgroundColor: c.color }]}
                onPress={() => onSelectColor(c.name)}
              />
            ))}
          </View>
          
          <View style={styles.divider} />
          
          {/* Кнопка создания заметки */}
          <TouchableOpacity style={styles.noteButton} onPress={onNote}>
            <Text style={styles.noteButtonText}>Создать заметку</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 220,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  noteButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  noteButtonText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
});