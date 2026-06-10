import api from './client';

export interface Answer {
  id: number;
  content: string;
  note_id: number;
  participant_id: number;
  created_at: string;
  author?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface AnswerCreate {
  content: string;
  note_id: number;
  session_id: number;
}

export const answerService = {
  // Получить ответы на заметку
  getAnswers: async (noteId: number): Promise<Answer[]> => {
    const response = await api.get(`/answer/?note_id=${noteId}`);
    return response.data;
  },

  // Создать ответ
  createAnswer: async (answer: AnswerCreate): Promise<Answer> => {
    const response = await api.post('/answer/create', answer);
    return response.data;
  },

  // Обновить ответ
  updateAnswer: async (id: number, content: string, noteId: number, sessionId: number): Promise<Answer> => {
    const response = await api.patch('/answer/update', { id, content, note_id: noteId, session_id: sessionId });
    return response.data;
  },

  // Удалить ответ
  deleteAnswer: async (id: number, noteId: number, sessionId: number): Promise<void> => {
    await api.post('/answer/delete', { id, note_id: noteId, session_id: sessionId });
  },
};