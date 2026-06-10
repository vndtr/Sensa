import api from './client';

export interface Session {
  id: number;
  name: string;
  book_id: number;
  is_active: boolean;
  link: string;
  user_id: number;  // создатель сессии
}

export interface SessionCreate {
  name: string;
  book_id: number;
}

export interface Participant {
  id: number;
  session_id: number;
  user_id: number;
  role_id: number;
  last_page: number;
  user?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
  };
}

export const sessionService = {
  // Получить все сессии пользователя
  getSessions: async (): Promise<Session[]> => {
    const response = await api.get('/session/');
    // API возвращает массив Session_Participant с вложенными session
    const participants = response.data;
    return participants.map((p: any) => p.session);
  },

  // Получить информацию о сессии
  getSession: async (sessionId: number): Promise<Session> => {
    const response = await api.get(`/session/info/${sessionId}`);
    return response.data;
  },

  // Создать сессию
  createSession: async (data: SessionCreate): Promise<Session> => {
    const response = await api.post('/session/', data);
    return response.data;
  },

  // Получить участников сессии
  getParticipants: async (sessionId: number): Promise<Participant[]> => {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
  },

  // Присоединиться к сессии по ссылке
  joinByLink: async (link: string, sessionId: number): Promise<void> => {
    await api.post(`/session/${link}`, null, { params: { session_id: sessionId } });
  },

  // Обновить прогресс чтения
  updateProgress: async (sessionId: number, lastPage: number): Promise<void> => {
    await api.post(`/session/${sessionId}/progress`, { last_page: lastPage });
  },

  // Получить прогресс
  getProgress: async (sessionId: number): Promise<{ last_page: number }> => {
    const response = await api.get(`/session/${sessionId}/progress`);
    return response.data;
  },

  // Выйти из сессии
  leaveSession: async (sessionId: number): Promise<void> => {
    await api.post(`/session/${sessionId}/leave`);
  },

  // Изменить роль участника
  changeRole: async (sessionId: number, userId: number, roleId: number): Promise<void> => {
    await api.put(`/session/${sessionId}/users/${userId}`, { role_id: roleId });
  },
};