// src/services/api.ts
import api from './client';
import { User } from './auth';

// Книги
export interface Book {
  id: number;
  title: string;
  author: string;
  user_id: number;
  cover_img: string;
  content_path: string;
  created_at: string;
}

export const bookService = {
  // Получить все книги пользователя
  getBooks: async (): Promise<Book[]> => {
    const response = await api.get('/book/');
    return response.data;
  },

   addBook: async (formData: FormData): Promise<Book> => {
    const response = await api.post('/book/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  // Получить книгу по ID
  getBook: async (id: number): Promise<Book> => {
    const response = await api.get(`/book/${id}`);
    return response.data;
  },
  
    
  // Обновить книгу
  updateBook: async (id: number, data: Partial<Book>): Promise<Book> => {
    const response = await api.patch(`/book/${id}`, data);
    return response.data;
  },
  
  // Удалить книгу
  deleteBook: async (id: number): Promise<void> => {
    await api.delete(`/book/${id}`);
  },
};

// Сессии
export interface Session {
  id: number;
  name: string;
  book_id: number;
  is_active: boolean;
  link: string;
}

export interface Participant {
  id: number;
  session_id: number;
  user_id: number;
  role_id: number;
  last_page: number;
  user?: User;
}

export const sessionService = {
  // Получить все сессии пользователя
  getSessions: async (): Promise<Session[]> => {
    const response = await api.get('/session/');
    return response.data;
  },
  
  // Получить сессию по ID
  getSession: async (id: number): Promise<Session> => {
    const response = await api.get(`/session/info/${id}`);
    return response.data;
  },
  
  // Создать сессию
  createSession: async (name: string, bookId: number): Promise<Session> => {
    const response = await api.post('/session/', { name, book_id: bookId });
    return response.data;
  },
  
  // Присоединиться к сессии по ссылке
  joinSession: async (link: string, sessionId: number): Promise<Session> => {
    const response = await api.post(`/session/${link}?session_id=${sessionId}`);
    return response.data;
  },
  
  // Получить участников сессии
  getParticipants: async (sessionId: number): Promise<Participant[]> => {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
  },
  
  // Обновить прогресс
  updateProgress: async (sessionId: number, lastPage: number): Promise<void> => {
    await api.post(`/session/${sessionId}/progress`, { last_page: lastPage });
  },
  
  // Покинуть сессию
  leaveSession: async (sessionId: number): Promise<void> => {
    await api.post(`/session/${sessionId}/leave`);
  },
};

// Контент книги из MinIO
// src/services/api.ts
export const contentService = {
  // Получить ВЕСЬ контент книги
  getBookContent: async (contentPath: string): Promise<Record<string, string>> => {
    // Загружаем все страницы сразу (увеличиваем limit до 1000)
    const response = await api.get(`/books/content/${contentPath}`, {
      params: { offset: 0, limit: 1000 }
    });
    console.log('Content loaded, pages:', Object.keys(response.data).length);
    return response.data;
  },
  
  // Получить конкретную страницу
  getBookPage: async (contentPath: string, pageNumber: number): Promise<string> => {
    const response = await api.get(`/books/content/${contentPath}`, {
      params: { offset: pageNumber - 1, limit: 1 }
    });
    // response.data - объект вида { "номер_страницы": "текст" }
    return response.data[pageNumber.toString()] || '';
  },
};