import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../App';

export default function AuthScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  async function handleAuth() {
    if (!email || !password) return Alert.alert('خطأ', 'املأ كل الحقول');
    setLoading(true);

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) Alert.alert('خطأ', error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sea Chat</Text>
      <Text style={styles.subtitle}>{isLogin ? 'تسجيل دخول' : 'حساب جديد'}</Text>

      <View style={styles.card}>
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
          placeholder="كلمة السر"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity 
          onPress={handleAuth} 
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? '...' : isLogin ? 'دخول' : 'تسجيل'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? 'ما عندك حساب؟ سجل' : 'عندك حساب؟ ادخل'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#020617', 
    justifyContent: 'center', 
    padding: 24 
  },
  title: { 
    color: '#3B82F6', 
    fontSize: 40, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: { 
    color: '#e2e8f0', 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
  switchText: { color: '#60a5fa', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
