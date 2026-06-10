// src/styles/common.ts

import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
  },
  
  buttonPrimaryText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '500',
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
  },
  
  buttonSecondaryText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '500',
  },
  
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

 // Иконки
  iconSmall: {
    width: 16,
    height: 16,
  },
  iconMedium: {
    width: 20,
    height: 20,
  },
  iconLarge: {
    width: 24,
    height: 24,
  },
  
  // Иконка удаления
  deleteIcon: {
    width: 18,
    height: 18,
    tintColor: colors.white,
  },

  // Иконка редактирования
  editIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textGray,
  },
  
  // Иконка ответа
  replyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
});