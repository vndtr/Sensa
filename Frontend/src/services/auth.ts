// src/services/auth.ts
import api from './client';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  background_color: string;
  font_size: number;
}

export const authService = {
  register: async (name: string, lastName: string, email: string, password: string) => {
    const response = await api.post('/auth/signup', {
      name,
      last_name: lastName,  // ← передаём фамилию
      email,
      password,
    });
    if (response.data.access_token) {
      await SecureStore.setItemAsync('access_token', response.data.access_token);
    }
    return response.data;
  },

  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (response.data.access_token) {
      await SecureStore.setItemAsync('access_token', response.data.access_token);
    }
    return response.data;
  },

  verify: async (): Promise<User> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch('/user/', data);
    return response.data;
  },
};