import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';

type Stats = { users: number; rooms: number; messages: number; reports: number };
type Report = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { username: string };
  reported: { username: string } | null;
  room_id: string | null;
};

export default function AdminPanelScreen({ navigation }) {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: 0, rooms: 0, messages: 0, reports: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadReports();
    
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, loadReports)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadStats() {
    const [users, rooms, messages, reports] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    
    setStats({
      users: users.count ?? 0,
      rooms: rooms.count ?? 0,
      messages: messages.count ?? 0,
      reports: reports.count ?? 0,
    });
    setLoading(false);
  }

  async function loadReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username), reported:reported_id(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!error) setReports(data as Report[]);
  }

  async function handleReport(reportId: string, action: 'resolve' | 'ban_user' | 'delete_room') {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (action === 'ban_user' && report.reported) {
      Alert.alert('تأكيد الحظر', `تحظر ${report.reported.username}؟`, [
        { text: 'الغاء' },
        {
          text: 'حظر',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('room_bans').insert({
              room_id: report.room_id,
              user_id: report.reported?.username,
              banned_by: session?.user.id,
              reason: report.reason
            });
            await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
            loadReports();
          }
        }
      ]);
    } else if (action === 'delete_room' && report.room_id) {
      Alert.alert('حذف الغرفة', 'متأكد؟', [
        { text: 'الغاء' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('rooms').delete().eq('id', report.room_id);
            await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
            loadStats();
            loadReports();
          }
        }
      ]);
    } else {
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      loadReports();
    }
  }

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon name={icon} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>لوحة التحكم</Text>
      
      <View style={styles.statsGrid}>
        <StatCard icon="people" label="المستخدمين" value={stats.users} color="#3b82f6" />
        <StatCard icon="chatbubbles" label="الغرف" value={stats.rooms} color="#10b981" />
        <StatCard icon="mail" label="الرسائل" value={stats.messages} color="#f59e0b" />
        <StatCard icon="warning" label="البلاغات" value={stats.reports} color="#ef4444" />
      </View>

      <Text style={styles.sectionTitle}>البلاغات الجديدة</Text>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportReason}>{item.reason}</Text>
              <Text style={styles.reportTime}>
                {new Date(item.created_at).toLocaleDateString('ar')}
              </Text>
            </View>
            <Text style={styles.reportMeta}>
              المبلغ: {item.reporter.username} | المبلغ عنه: {item.reported?.username ?? 'غرفة'}
            </Text>
            <View style={styles.reportActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                onPress={() => handleReport(item.id, 'resolve')}>
                <Text style={styles.actionText}>تجاهل</Text>
              </TouchableOpacity>
              {item.reported && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => handleReport(item.id, 'ban_user')}>
                  <Text style={styles.actionText}>حظر مستخدم</Text>
                </TouchableOpacity>
              )}
              {item.room_id && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleReport(item.id, 'delete_room')}>
                  <Text style={styles.actionText}>حذف غرفة</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  title: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10 },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderLeftWidth: 4,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#f1f5f9', marginTop: 8 },
  statLabel: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#f1f5f9', padding: 20, paddingBottom: 10 },
  reportCard: { backgroundColor: '#1e293b', margin: 10, marginTop: 0, borderRadius: 12, padding: 16 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportReason: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', flex: 1 },
  reportTime: { fontSize: 12, color: '#64748b' },
  reportMeta: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  reportActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
