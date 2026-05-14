import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from './supabase';
import { Ionicons } from '@expo/vector-icons';
import WelcomeScreen from './screens/Welcome';
import LoginScreen from './screens/Login';
import RoomsScreen from './screens/Rooms';
import ChatsScreen from './screens/Chats';
import ProfileScreen from './screens/Profile';
import SettingsScreen from './screens/Settings';
import ChatRoomScreen from './screens/ChatRoom';
import CreateRoomScreen from './screens/CreateRoom';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0B1120', borderTopWidth: 0 },
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#64748B',
      tabBarIcon: ({ color, size }) => {
        let icon = 'home';
        if (route.name === 'Rooms') icon = 'chatbubbles';
        if (route.name === 'Chats') icon = 'person';
        if (route.name === 'Profile') icon = 'person-circle';
        if (route.name === 'Settings') icon = 'settings';
        return <Ionicons name={icon} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Rooms" component={RoomsScreen} options={{title: 'الغرف'}} />
      <Tab.Screen name="Chats" component={ChatsScreen} options={{title: 'محادثات'}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{title: 'حسابي'}} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{title: 'الاعدادات'}} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <View className="flex-1 bg-slate-950 justify-center"><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <AuthContext.Provider value={{ session, supabase }}>
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session? (
            <>
              <Stack.Screen name="Main" component={Tabs} />
              <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
              <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
