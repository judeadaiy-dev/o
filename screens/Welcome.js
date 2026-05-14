import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={['#0B1120', '#1E1B4B']} className="flex-1 justify-center items-center px-6">
      <Text className="text-6xl mb-4">🌊</Text>
      <Text className="text-4xl font-bold text-white mb-2">SeaChat</Text>
      <Text className="text-slate-400 text-lg mb-12 text-center">دردشة سريعة. خصوصية كاملة. تصميم 2026</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} className="bg-blue-600 w-full p-4 rounded-2xl">
        <Text className="text-white text-center font-bold text-lg">ابدأ الآن</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}
