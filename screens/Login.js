import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../App';

export default function LoginScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true);
    const fn = isLogin? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) Alert.alert('خطأ', error.message);
    else if (!isLogin) Alert.alert('تم', 'سجل دخولك الآن');
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-slate-950 justify-center px-6">
      <Text className="text-3xl font-bold text-white mb-8 text-center">{isLogin? 'تسجيل الدخول' : 'حساب جديد'}</Text>
      <TextInput className="bg-slate-800 text-white p-4 rounded-xl mb-4" placeholder="الايميل" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput className="bg-slate-800 text-white p-4 rounded-xl mb-6" placeholder="كلمة المرور" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity onPress={handleAuth} disabled={loading} className="bg-blue-600 p-4 rounded-xl mb-4">
        <Text className="text-white text-center font-bold text-lg">{loading? '...' : isLogin? 'دخول' : 'انشاء حساب'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text className="text-blue-400 text-center">{isLogin? 'ماعندك حساب؟ سجل' : 'عندك حساب؟ ادخل'}</Text>
      </TouchableOpacity>
    </View>
  );
}
