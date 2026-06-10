import api from './client';

export interface SoloQuote {
  id: number;
  selected_text: string;
  color: string;
  solo_session_id: number;
  start_index: number;
  end_index: number;
  created_at?: string;
}

export interface SoloQuoteCreate {
  selected_text: string;
  color: string;
  start_index: number;
  end_index: number;
  solo_session_id: number;
}

export interface SoloQuoteUpdate {
  id: number;
  solo_session_id: number;
  selected_text?: string;
  color?: string;
  start_index?: number;
  end_index?: number;
}

export const soloQuoteService = {
  // Получить все цитаты для сессии
  getQuotes: async (soloSessionId: number): Promise<SoloQuote[]> => {
    const response = await api.get(`/solo_session/quote/${soloSessionId}`);
    return response.data;
  },

  // Создать цитату
  createQuote: async (quote: SoloQuoteCreate): Promise<SoloQuote> => {
    const response = await api.post('/solo_session/quote/', quote);
    return response.data;
  },

  // Обновить цитату (обычно не нужно, но оставим)
  updateQuote: async (quote: SoloQuoteUpdate): Promise<SoloQuote> => {
    const response = await api.patch('/solo_session/quote/', quote);
    return response.data;
  },

  // Удалить цитату
  deleteQuote: async (id: number, soloSessionId: number): Promise<void> => {
    await api.delete('/solo_session/quote/', { data: { id, solo_session_id: soloSessionId } });
  },
};