import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';

type Profile = {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type Stats = {
  roomsOwned: number;
  messagesSent: number;
  joinedAt: string;
};

export default function ProfileScreen({ navigation }: any) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ roomsOwned: 0, messagesSent: 0, joinedAt: '' });
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    getProfile();
    getStats();
  }, []);

  async function getProfile() {
    const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session?.user.id)
    .single();

    if (!error && data) {
      setProfile(data);
      setUsername(data.username || '');
      setBio(data.bio || '');
    }
  }

  async function getStats() {
    const [roomsRes, messagesRes] = await Promise.all([
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('created_by', session?.user.id),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', session?.user.id)
    ]);

    setStats({
      roomsOwned: roomsRes.count || 0,
      messagesSent: messagesRes.count || 0,
      joinedAt: session?.user.created_at || ''
    });
  }

  async function pickAvatar() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 512,
      maxHeight: 512,
    });

    if (result.didCancel ||!result.assets?.[0]?.base64) return;

    setUploadingAvatar(true);
    const asset = result.assets[0];
    const fileExt = asset.type?.split('/')[1] || 'jpg';
    const path = `avatars/${session?.user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(asset.base64), {
        contentType: asset.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      Alert.alert('خطأ', 'فشل رفع الصورة');
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', session?.user.id);

    if (!updateError) {
      setProfile(prev => prev? {...prev, avatar_url: data.publicUrl } : null);
      Alert.alert('تم', 'تم تحديث الصورة');
    }

    setUploadingAvatar(false);
  }

  async function updateProfile() {
    if (!username.trim()) {
      return Alert.alert('خطأ', 'اكتب اسم المستخدم');
    }

    setLoading(true);
    const { error } = await supabase
    .from('profiles')
    .upsert({
        id: session?.user.id,
        username: username.trim(),
        bio: bio.trim() || null,
        updated_at: new Date().toISOString()
      });

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      Alert.alert('تم', 'تم تحديث الملف الشخصي');
      setEditing(false);
      getProfile();
    }
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert('تسجيل خروج', 'متأكد تريد تسجل خروج؟', [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('خطأ', error.message);
        }
      }
    ]);
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>الملف الشخصي</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Icon name="settings-outline" size={24} color="#f1f5f9" />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
          <Image
            source={{ uri: profile.avatar_url || 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
          {uploadingAvatar? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarBadge}>
              <Icon name="camera" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile.username}</Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="chatbubbles" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.roomsOwned}</Text>
          <Text style={styles.statLabel}>غرف</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="mail" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.messagesSent}</Text>
          <Text style={styles.statLabel}>رسالة</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="calendar" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>
            {new Date(stats.joinedAt).toLocaleDateString('ar', { month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.statLabel}>انضم</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>المعلومات</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Icon name="create-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>

        {editing? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم المستخدم</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                maxLength={20}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>النبذة</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                maxLength={150}
                placeholder="اكتب نبذة عنك..."
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setEditing(false);
                  setUsername(profile.username);
                  setBio(profile.bio || '');
                }}
              >
                <Text style={styles.buttonSecondaryText}>الغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={updateProfile}
                disabled={loading}
              >
                {loading? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>حفظ</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>اسم المستخدم</Text>
              <Text style={styles.infoValue}>{profile.username}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>النبذة</Text>
              <Text style={styles.infoValue}>{profile.bio || 'لا توجد نبذة'}</Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>تسجيل خروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#3b82f6' },
  avatarOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#020617',
  },
  profileName: { fontSize: 24, fontWeight: '700', color: '#f1f5f9', marginTop: 16 },
  profileEmail: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  infoRow: { paddingVertical: 12 },
  infoLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#f1f5f9', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#3b82f6' },
  buttonSecondary: { backgroundColor: '#334155' },
  buttonPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonSecondaryText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#7f1d1d',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: { color: '#fecaca', fontSize: 16, fontWeight: '700' },
});
