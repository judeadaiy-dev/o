import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // التعديل الجديد هنا
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from './lib/supabase';

import AuthScreen from './screens/AuthScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import Chats from './screens/Chats'; 
import CreateRoom from './screens/CreateRoom'; 
import Login from './screens/Login';
import Profile from './screens/Profile'; 
import Rooms from './screens/Rooms'; 
import Settings from './screens/Settings'; 

const Stack = createNativeStackNavigator(); // استخدام المحرك الأصلي السريع
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Rooms" component={Rooms} options={{ 
        title: 'الغرف',
        tabBarIcon: ({ color, size }) => <Icon name="forum" size={size} color={color} />
      }} />
      <Tab.Screen name="Chats" component={Chats} options={{ 
        title: 'المحادثات',
        tabBarIcon: ({ color, size }) => <Icon name="chat" size={size} color={color} />
      }} />
      <Tab.Screen name="Profile" component={Profile} options={{ 
        title: 'حسابي',
        tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />
      }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {session ? (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
                <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
                <Stack.Screen name="CreateRoom" component={CreateRoom} />
                <Stack.Screen name="Settings" component={Settings} />
              </>
            ) : (
              <Stack.Screen name="Auth" component={Login} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
