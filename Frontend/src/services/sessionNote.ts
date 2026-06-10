import api from './client';

export interface SessionNote {
  id: number;
  selected_text: string;
  color: string;
  session_id: number;
  is_private: boolean;
  comment: string;
  start_index: number;
  end_index: number;
  participant_id: number;
  created_at: string;
    author?: {           // ← добавить информацию об авторе
    id: number;
    name: string;
    role_id: number;
  };
}

export interface SessionNoteCreate {
  selected_text: string;
  color: string;
  is_private: boolean;
  comment: string;
  start_index: number;
  end_index: number;
  session_id: number;
}

export interface SessionNoteUpdate {
  id: number;
  session_id: number;
  selected_text?: string;
  color?: string;
  is_private?: boolean;
  comment?: string;
  start_index?: number;
  end_index?: number;
}

export const sessionNoteService = {
  // Получить все заметки сессии
getNotes: async (sessionId: number): Promise<SessionNote[]> => {
    const response = await api.get(`/session/note/?session_id=${sessionId}`);
    return response.data;
  },

  // Создать заметку
  createNote: async (note: SessionNoteCreate): Promise<SessionNote> => {
    const response = await api.post('/session/note/create', note);
    return response.data;
  },

  // Обновить заметку
  updateNote: async (note: SessionNoteUpdate): Promise<SessionNote> => {
    const response = await api.post('/session/note/update', note);
    return response.data;
  },

  // Удалить заметку
  deleteNote: async (id: number, sessionId: number): Promise<void> => {
    await api.post('/session/note/delete', { id, session_id: sessionId });
  },
};