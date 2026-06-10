import api from './client';

export interface SoloSession {
  id: number;
  book_id: number;
  user_id: number;
  last_position: number;
}

export const soloSessionService = {
  // Получить или создать сессию для книги
  getOrCreateSession: async (bookId: number): Promise<SoloSession> => {
  try {
    // Пытаемся получить существующую сессию
    const response = await api.get(`/solo_session/?book_id=${bookId}`);
    
    // Если сессия существует, возвращаем её
    if (response.data && response.data.id) {
      return response.data;
    }
    
    // Если нет, создаём новую
    const createResponse = await api.post(`/solo_session/create?book_id=${bookId}`);
    return createResponse.data;
    
  } catch (error: any) {
    // Если ошибка 404 (сессия не найдена) или data = null
    if (error.response?.status === 404 || error.response?.data === null) {
      const createResponse = await api.post(`/solo_session/create?book_id=${bookId}`);
      return createResponse.data;
    }
    throw error;
  }
},

  // Получить последнюю сессию пользователя
  getLastSession: async (): Promise<SoloSession | null> => {
    try {
      const response = await api.get('/solo_session/last');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Обновить прогресс чтения
  updateProgress: async (sessionId: number, lastPage: number): Promise<void> => {
    await api.post(`/solo_session/${sessionId}/progress`, { last_page: lastPage });
  },

  // Получить прогресс
  getProgress: async (sessionId: number): Promise<{ last_page: number }> => {
    const response = await api.get(`/solo_session/${sessionId}/progress`);
    return response.data;
  },
};