import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useAuth } from '../App';

export default function ProfileScreen({ navigation }) {
  const { session, supabase } = useAuth();
  const [username, setUsername] = useState('');
  const [editing, setEditing] = useState(false);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // جلب بيانات اليوزر + غرفته
  useEffect(() => {
    getProfile();
    getMyRoom();
  }, []);

  async function getProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();
    if (data) setUsername(data.username || '');
  }

  async function getMyRoom() {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('created_by', session.user.id)
      .single();
    if (data) setMyRoom(data);
  }

  async function updateUsername() {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, username });
    
    if (error) Alert.alert('خطأ', error.message);
    else {
      Alert.alert('تم', 'تحديث الاسم بنجاح');
      setEditing(false);
    }
    setLoading(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('خطأ', error.message);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* كارت زجاجي للبروفايل */}
      <View style={styles.glassCard}>
        <Text style={styles.title}>حسابي</Text>
        
        <Text style={styles.label}>الايميل</Text>
        <Text style={styles.value}>{session.user.email}</Text>
        
        <Text style={styles.label}>اسم المستخدم</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput 
              style={styles.input} 
              value={username} 
              onChangeText={setUsername}
              placeholder="اكتب اسمك"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity onPress={updateUsername} disabled={loading} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{loading ? '...' : 'حفظ'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.value}>{username || 'اضغط للتعديل'}</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.label}>انضممت</Text>
        <Text style={styles.value}>
          {new Date(session.user.created_at).toLocaleDateString('ar-IQ')}
        </Text>
      </View>

      {/* كارت زجاجي للغرفة */}
      {myRoom && (
        <TouchableOpacity 
          style={styles.glassCard}
          onPress={() => navigation.navigate('ChatRoom', { roomId: myRoom.id })}
        >
          <Text style={styles.cardTitle}>غرفتي</Text>
          <Text style={styles.roomName}>{myRoom.name}</Text>
          <Text style={styles.roomDesc}>{myRoom.description || 'لا يوجد وصف'}</Text>
          <Text style={styles.enterText}>اضغط للدخول →</Text>
        </TouchableOpacity>
      )}

      {/* زر تسجيل الخروج */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>تسجيل خروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  content: {
    padding: 24, // p-6
    paddingTop: 64, // pt-16
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // slate-800 مع شفافية
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)', // slate-400 شفاف
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#94a3b8', // slate-400
    fontSize: 14,
    marginTop: 12,
  },
  value: {
    color: '#e2e8f0', // slate-300
    fontSize: 18,
    marginTop: 4,
  },
  editRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // slate-900 شفاف
    color: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  saveBtn: {
    backgroundColor: '#2563eb', // blue-600
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardTitle: {
    color: '#60a5fa', // blue-400
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roomName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roomDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  enterText: {
    color: '#60a5fa',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'left',
  },
  logoutBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)', // red-600 شفاف
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  logoutText: {
    color: '#f87171', // red-400
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
