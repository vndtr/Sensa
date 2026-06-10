import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface Participant {
  id: number;
  user_id: number;
  name: string;
  last_name: string;
  role_id: number;
  role_name: string;
}

interface ParticipantsModalProps {
  visible: boolean;
  sessionId: number;
  currentUserId: number;
  onClose: () => void;
  onRoleChange?: (userId: number, newRoleId: number) => void;
  isAdmin?: boolean;
}

export default function ParticipantsModal({ 
  visible, 
  sessionId, 
  currentUserId, 
  onClose, 
  onRoleChange,
  isAdmin = false 
}: ParticipantsModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadParticipants();
    }
  }, [visible, sessionId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // заменить на реальный API-запрос
      // const response = await api.get(`/session/${sessionId}/participants`);
      // setParticipants(response.data);
      
      // Временные данные
      setParticipants([
        { id: 1, user_id: 1, name: 'Анна', last_name: 'Иванова', role_id: 2, role_name: 'Админ' },
        { id: 2, user_id: 2, name: 'Петр', last_name: 'Петров', role_id: 1, role_name: 'Участник' },
        { id: 3, user_id: 3, name: 'Мария', last_name: 'Сидорова', role_id: 1, role_name: 'Участник' },
      ]);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: number, newRoleId: number) => {
    if (onRoleChange) {
      onRoleChange(userId, newRoleId);
    }
    // Обновляем локально
    setParticipants(prev => prev.map(p =>
      p.user_id === userId
        ? { ...p, role_id: newRoleId, role_name: newRoleId === 2 ? 'Админ' : 'Участник' }
        : p
    ));
  };

  const renderParticipant = ({ item }: { item: Participant }) => {
    const isCurrentUser = item.user_id === currentUserId;
    const canChangeRole = isAdmin && !isCurrentUser;

    return (
      <View style={styles.participantItem}>
        <View style={styles.participantAvatar}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {item.name} {item.last_name}
            {isCurrentUser && <Text style={styles.youBadge}> (Вы)</Text>}
          </Text>
          <Text style={styles.participantRole}>
            {item.role_id === 2 ? 'Админ' : 'Участник'}
          </Text>
        </View>
        
        {canChangeRole && (
          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleChange(item.user_id, item.role_id === 2 ? 1 : 2)}
          >
            <Text style={styles.roleButtonText}>
              {item.role_id === 2 ? ' Сделать участником' : 'Назначить админом'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Участники сессии</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
          ) : (
            <FlatList
              data={participants}
              renderItem={renderParticipant}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Нет участников</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
            <Text style={styles.closeModalButtonText}>Закрыть</Text>
          </TouchableOpacity>
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
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textGray,
  },
  list: {
    padding: spacing.md,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: 'normal',
    color: colors.textGray,
  },
  participantRole: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 2,
  },
  roleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  roleButtonText: {
    fontSize: 12,
    color: colors.primary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textGray,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textGray,
  },
  closeModalButton: {
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeModalButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
});