import { View, Text } from 'react-native';
import { useAuth } from '../App';
export default function ProfileScreen() {
  const { session } = useAuth();
  return (
    <View className="flex-1 bg-slate-950 p-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-4">حسابي</Text>
      <Text className="text-slate-300 text-lg">{session.user.email}</Text>
      <Text className="text-slate-400 mt-2">انضممت: {new Date(session.user.created_at).toLocaleDateString('ar')}</Text>
    </View>
  );
}
