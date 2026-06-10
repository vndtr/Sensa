import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SessionsScreen from '../screens/SessionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SoloReader from '../components/reader/SoloReader';
import SessionReader from '../components/reader/SessionReader';
import { colors } from '../styles/colors';
import { Image } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="SoloReader" component={SoloReader} />
      <Stack.Screen name="SessionReader" component={SessionReader} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Главная" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../assets/main.png')} 
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
       <Tab.Screen 
        name="Библиотека" 
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../assets/library.png')} 
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Сессии" 
        component={SessionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../assets/session.png')} 
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Профиль" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../assets/profile.png')} 
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default MainStack;