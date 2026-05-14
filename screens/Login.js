import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../App';

export default function LoginScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true);
    const fn = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) Alert.alert('خطأ', error.message);
    else if (!isLogin) Alert.alert('تم', 'سجل دخولك الآن');
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'تسجيل الدخول' : 'حساب جديد'}</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="الايميل" 
        placeholderTextColor="#64748b" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none" 
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="كلمة المرور" 
        placeholderTextColor="#64748b" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      <TouchableOpacity onPress={handleAuth} disabled={loading} style={styles.button}>
        <Text style={styles.buttonText}>
          {loading ? '...' : isLogin ? 'دخول' : 'انشاء حساب'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.switchText}>
          {isLogin ? 'ماعندك حساب؟ سجل' : 'عندك حساب؟ ادخل'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // bg-slate-950
    justifyContent: 'center',
    paddingHorizontal: 24, // px-6
  },
  title: {
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32, // mb-8
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e293b', // bg-slate-800
    color: '#fff',
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    marginBottom: 16, // mb-4
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb', // bg-blue-600
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    marginBottom: 16, // mb-4
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18, // text-lg
  },
  switchText: {
    color: '#60a5fa', // text-blue-400
    textAlign: 'center',
  },
});
