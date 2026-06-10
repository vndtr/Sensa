import api from './client';

export interface SessionQuote {
  id: number;
  selected_text: string;
  color: string;
  session_id: number;
  start_index: number;
  end_index: number;
  created_at: string;
}

export interface SessionQuoteCreate {
  selected_text: string;
  color: string;
  start_index: number;
  end_index: number;
  session_id: number;
}

export const sessionQuoteService = {
  // Получить все цитаты сессии
  getQuotes: async (sessionId: number): Promise<SessionQuote[]> => {
    const response = await api.get(`/session/quote/?session_id=${sessionId}`);
    return response.data;
  },

  // Создать цитату
  createQuote: async (quote: SessionQuoteCreate): Promise<SessionQuote> => {
    const response = await api.post('/session/quote/create', quote);
    return response.data;
  },

  // Удалить цитату
  deleteQuote: async (id: number, sessionId: number): Promise<void> => {
    await api.post('/session/quote/delete', { id, session_id: sessionId });
  },
};