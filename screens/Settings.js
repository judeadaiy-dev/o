import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../App';
export default function SettingsScreen() {
  const { supabase } = useAuth();
  return (
    <View className="flex-1 bg-slate-950 p-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">الاعدادات</Text>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} className="bg-red-600 p-4 rounded-xl">
        <Text className="text-white text-center font-bold">تسجيل خروج</Text>
      </TouchableOpacity>
    </View>
  );
}
