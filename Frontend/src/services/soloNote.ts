import api from './client';

export interface SoloNote {
  id: number;
  selected_text: string;
  color: string;
  solo_session_id: number;
  comment: string;
  start_index: number;
  end_index: number;
  created_at?: string;
}

export interface SoloNoteCreate {
  selected_text: string;
  color: string;
  comment: string;
  start_index: number;
  end_index: number;
  solo_session_id: number;
}

export interface SoloNoteUpdate {
  id: number;
  solo_session_id: number;
  selected_text?: string;
  color?: string;
  comment?: string;
  start_index?: number;
  end_index?: number;
}

export const soloNoteService = {
  // Получить все заметки для сессии
  getNotes: async (soloSessionId: number): Promise<SoloNote[]> => {
    const response = await api.get(`/solo_session/note/${soloSessionId}`);
    return response.data;
  },

  // Создать заметку
  createNote: async (note: SoloNoteCreate): Promise<SoloNote> => {
    const response = await api.post('/solo_session/note/', note);
    return response.data;
  },

  // Обновить заметку
  updateNote: async (note: SoloNoteUpdate): Promise<SoloNote> => {
    const response = await api.patch('/solo_session/note/', note);
    return response.data;
  },

  // Удалить заметку
  deleteNote: async (id: number, soloSessionId: number): Promise<void> => {
    await api.delete('/solo_session/note/', { data: { id, solo_session_id: soloSessionId } });
  },
};