import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../App';
import Icon from 'react-native-vector-icons/Ionicons';

export default function AdminPanelScreen({ navigation }) {
  const { supabase, session } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0,
    messages: 0,
    reports: 0
  });
  const [reports, setReports] = useState([]);

  useEffect(() => {
    loadStats();
    loadReports();
  }, []);

  async function loadStats() {
    const [{ count: users }, { count: rooms }, { count: messages }, { count: reports }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
    ]);
    setStats({ users, rooms, messages, reports });
  }

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username), reported:reported_id(username)')
      .order('created_at', { ascending: false })
      .limit(10);
    setReports(data || []);
  }

  async function deleteUser(userId) {
    Alert.alert('تأكيد', 'تحذف هذا المستخدم؟', [
      { text: 'الغاء' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.admin.deleteUser(userId);
          Alert.alert('تم', 'انحذف المستخدم');
          loadStats();
        }
      }
    ]);
  }

  async function deleteRoom(roomId) {
    Alert.alert('تأكيد', 'تحذف هذه الغرفة؟', [
      { text: 'الغاء' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('rooms').delete().eq('id', roomId);
          Alert.alert('تم', 'انحذفت الغرفة');
          loadStats();
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>لوحة التحكم</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="people" size={32} color="#3B82F6" />
          <Text style={styles.statNumber}>{stats.users}</Text>
          <Text style={styles.statLabel}>مستخدم</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="chatbubbles" size={32} color="#10b981" />
          <Text style={styles.statNumber}>{stats.rooms}</Text>
          <Text style={styles.statLabel}>غرفة</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="mail" size={32} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.messages}</Text>
          <Text style={styles.statLabel}>رسالة</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="warning" size={32} color="#ef4444" />
          <Text style={styles.statNumber}>{stats.reports}</Text>
          <Text style={styles.statLabel}>بلاغ</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>اخر البلاغات</Text>
      {reports.map((report) => (
        <View key={report.id} style={styles.reportCard}>
          <Text style={styles.reportText}>
            <Text style={styles.bold}>{report.reporter?.username}</Text> بلغ عن{' '}
            <Text style={styles.bold}>{report.reported?.username}</Text>
          </Text>
          <Text style={styles.reportReason}>{report.reason}</Text>
          <View style={styles.reportActions}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnDanger]}
              onPress={() => deleteUser(report.reported_id)}
            >
              <Text style={styles.btnText}>حذف المستخدم</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    gap: 16,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  statNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 12,
  },
  reportCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  reportText: { color: '#e2e8f0', fontSize: 15, marginBottom: 8 },
  bold: { fontWeight: 'bold', color: '#fff' },
  reportReason: { color: '#94a3b8', fontSize: 14, marginBottom: 12 },
  reportActions: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnDanger: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
