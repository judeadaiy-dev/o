import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';

export default function AuthScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('خطأ', 'املأ كل الحقول المطلوبة');
    }

    if (!validateEmail(email)) {
      return Alert.alert('خطأ', 'الايميل غير صحيح');
    }

    if (password.length < 6) {
      return Alert.alert('خطأ', 'كلمة السر لازم 6 أحرف على الأقل');
    }

    if (!isLogin && !username.trim()) {
      return Alert.alert('خطأ', 'اكتب اسم المستخدم');
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password,
          options: {
            data: { username: username.trim() }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          // انشاء بروفايل
          await supabase.from('profiles').insert({
            id: data.user.id,
            username: username.trim(),
            email: email.trim()
          });
          Alert.alert('تم', 'تم انشاء الحساب. سجل دخولك الآن');
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Icon name="chatbubbles" size={80} color="#3b82f6" style={styles.logo} />
        <Text style={styles.title}>Sea Chat</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'مرحباً بعودتك' : 'انشاء حساب جديد'}
        </Text>

        <View style={styles.card}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Icon name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="الايميل"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="كلمة السر"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#64748b" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleAuth} 
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'تسجيل دخول' : 'انشاء حساب'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            setIsLogin(!isLogin);
            setPassword('');
          }}>
            <Text style={styles.switchText}>
              {isLogin ? 'ما عندك حساب؟ سجل الآن' : 'عندك حساب؟ سجل دخول'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, color: '#f1f5f9', fontSize: 16 },
  button: {
    backgroundColor: '#3b82f6',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { color: '#60a5fa', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
