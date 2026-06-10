// src/store/authStore.ts
import { create } from 'zustand';
import { authService, User } from '../services/auth';
import api from '../services/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, lastName: string, email: string, password: string) => Promise<void>;  // ← добавили lastName
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateSettings: (fontSize: number, backgroundColor: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      await authService.login(username, password);
      const user = await authService.verify();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, lastName, email, password) => {  // ← добавили lastName
    set({ isLoading: true });
    try {
      await authService.register(name, lastName, email, password);
      const user = await authService.verify();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.verify();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch('/user/', data);
      const currentUser = get().user;
      set({ 
        user: currentUser ? { ...currentUser, ...response.data } : null,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Найдите метод updateSettings и измените порядок параметров
  updateSettings: async (fontSize: number, backgroundColor: string) => {
  set({ isLoading: true });
  try {
    const updatedUser = await authService.updateProfile({ 
      font_size: fontSize, 
      background_color: backgroundColor 
    });
    set({ user: updatedUser, isLoading: false });
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
},
}));