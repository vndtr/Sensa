import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

type WebSocketMessage = {
  type: string;
  data?: any;
};

type WebSocketEventHandlers = {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: number | null = null;
  private handlers: WebSocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionalClose = false;

  // Получение IP адреса
  private getApiUrl(): string {
    // Пробуем получить из Constants
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.31.224:5000';
    return apiUrl;
  }

  // Подключение к WebSocket
  connect(sessionId: number, handlers: WebSocketEventHandlers) {
    this.sessionId = sessionId;
    this.handlers = handlers;
    this.isIntentionalClose = false;
    this.reconnectAttempts = 0;
    
    this.establishConnection();
  }

  private async establishConnection() {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        console.error('No token for WebSocket connection');
        return;
      }

      const apiUrl = this.getApiUrl();
      const wsUrl = apiUrl.replace('http', 'ws').replace('https', 'wss');
      
      const wsConnectionUrl = `${wsUrl}/ws/session/${this.sessionId}?token=${token}`;
      
      console.log('Connecting to WebSocket:', wsConnectionUrl);
      
      this.ws = new WebSocket(wsConnectionUrl);

      this.ws.onopen = () => {
        console.log(`WebSocket connected to session ${this.sessionId}`);
        this.reconnectAttempts = 0;
        this.handlers.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          this.handlers.onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handlers.onError?.(error);
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected from session ${this.sessionId}, code: ${event.code}`);
        this.handlers.onDisconnect?.();
        
        // Автоматическое переподключение
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.establishConnection();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
    }
  }

  // Отправка сообщения
  sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open, message not sent');
    }
  }

  // Отключение
  disconnect() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
  }

  // Проверка состояния
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();