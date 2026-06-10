import api from './client';

export interface Book {
  id: number;
  title: string;
  author: string;
  content_path: string;
  cover_img: string;
  user_id: number;
}

export const bookService = {
  // Получить информацию о книге
  getBook: async (bookId: number): Promise<Book> => {
    const response = await api.get(`/book/${bookId}`);
    return response.data;
  },

  // Получить содержимое книги (постранично)
  getBookContent: async (contentPath: string, offset: number = 0, limit: number = 1): Promise<Record<string, string>> => {
    const response = await api.get(`/books/content/${contentPath}`, {
      params: { offset, limit }
    });
    return response.data;
  },

  getUserBooks: async (): Promise<Book[]> => {
  const response = await api.get('/book/');
  return response.data;
},



  // Получить обложку книги
  getBookCover: async (coverPath: string): Promise<string> => {
    // Для обложки используем прямой URL к MinIO
    return `http://192.168.31.224:5000/books/cover/${coverPath}`;
  },
  deleteBook: async (bookId: number): Promise<void> => {
    await api.delete(`/book/${bookId}`);
  },
};