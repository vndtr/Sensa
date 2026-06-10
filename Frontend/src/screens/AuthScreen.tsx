// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');  // ← добавили фамилию
  const { login, register, isLoading } = useAuthStore();

  const handleSubmit = async () => {
    if (isLogin) {
      if (!username || !password) {
        Alert.alert('Ошибка', 'Заполните все поля');
        return;
      }
      try {
        await login(username, password);
      } catch (error: any) {
        let errorMessage = 'Неверное имя пользователя или пароль';
        if (error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (Array.isArray(detail)) {
            errorMessage = detail[0]?.msg || 'Ошибка валидации';
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          }
        }
        Alert.alert('Ошибка', errorMessage);
      }
    } else {
      // Регистрация: теперь проверяем имя, фамилию, email, пароль
      if (!name || !lastName || !email || !password) {
        Alert.alert('Ошибка', 'Заполните все поля');
        return;
      }
      try {
        await register(name, lastName, email, password);  
      } catch (error: any) {
        let errorMessage = 'Что-то пошло не так';
        if (error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (Array.isArray(detail)) {
            errorMessage = detail[0]?.msg || 'Ошибка валидации';
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          }
        }
        Alert.alert('Ошибка', errorMessage);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sensa</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Вход в аккаунт' : 'Создание аккаунта'}
        </Text>

        <View style={styles.form}>
          {isLogin ? (
            // Форма входа
            <>
              <TextInput
                style={styles.input}
                placeholder="Имя пользователя"
                placeholderTextColor={colors.textLight}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          ) : (
            // Форма регистрации
            <>
              <TextInput
                style={styles.input}
                placeholder="Имя"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Фамилия"
                placeholderTextColor={colors.textLight}
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={styles.input}
                placeholder="Электронная почта"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            setIsLogin(!isLogin);
            // Очищаем поля при переключении
            setUsername('');
            setName('');
            setLastName('');
            setEmail('');
            setPassword('');
          }}>
            <Text style={styles.switchText}>
              {isLogin
                ? 'Нет аккаунта? Зарегистрироваться'
                : 'Уже есть аккаунт? Войти'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textGray,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
  },
});