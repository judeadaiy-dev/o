import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

type BlockedUser = {
  id: string;
  blocked_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function BlockedUsersScreen({ navigation }: any) {
  const { session } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  async function fetchBlockedUsers() {
    const { data, error } = await supabase
   .from('blocks')
   .select('*, profiles:blocked_id(username, avatar_url)')
   .eq('blocker_id', session?.user.id)
   .order('created_at', { ascending: false });

    if (!error) setBlockedUsers(data as BlockedUser[]);
    setLoading(false);
  }

  async function unblockUser(blockId: string, username: string) {
    Alert.alert('الغاء الحظر', `الغاء حظر ${username}؟`, [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'تأكيد',
        onPress: async () => {
          const { error } = await supabase
         .from('blocks')
         .delete()
         .eq('id', blockId);

          if (!error) {
            setBlockedUsers(prev => prev.filter(b => b.id!== blockId));
            Alert.alert('تم', 'تم الغاء الحظر');
          }
        }
      }
    ]);
  }

  const renderUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <Image
        source={{ uri: item.profiles.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.profiles.username}</Text>
        <Text style={styles.date}>
          محظور منذ {new Date(item.created_at).toLocaleDateString('ar')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        onPress={() => unblockUser(item.id, item.profiles.username)}
      >
        <Text style={styles.unblockText}>الغاء الحظر</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.title}>المحظورين</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={blockedUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="ban-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>لا يوجد مستخدمين محظورين</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  list: { padding: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
  date: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  unblockBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 16 },
});
