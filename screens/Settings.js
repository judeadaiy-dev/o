import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useAuth } from '../App';
import Icon from 'react-native-vector-icons/Ionicons';

export default function SettingsScreen({ navigation }) {
  const { supabase, session } = useAuth();

  async function handleLogout() {
    Alert.alert(
      'تسجيل خروج',
      'متأكد تريد تسجل خروج؟',
      [
        { text: 'الغاء', style: 'cancel' },
        { 
          text: 'خروج', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('خطأ', error.message);
          }
        }
      ]
    );
  }

  function openPrivacy() {
    Linking.openURL('https://yoursite.com/privacy');
  }

  function openTerms() {
    Linking.openURL('https://yoursite.com/terms');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>الاعدادات</Text>

      {/* كارت الحساب */}
      <View style={styles.glassCard}>
        <Text style={styles.sectionTitle}>الحساب</Text>
        
        <TouchableOpacity 
          style={styles.row}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person-circle-outline" size={24} color="#60a5fa" />
          <Text style={styles.rowText}>الملف الشخصي</Text>
          <Icon name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* كارت التطبيق */}
      <View style={styles.glassCard}>
        <Text style={styles.sectionTitle}>التطبيق</Text>
        
        <TouchableOpacity style={styles.row} onPress={openPrivacy}>
          <Icon name="shield-checkmark-outline" size={24} color="#60a5fa" />
          <Text style={styles.rowText}>سياسة الخصوصية</Text>
          <Icon name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={openTerms}>
          <Icon name="document-text-outline" size={24} color="#60a5fa" />
          <Text style={styles.rowText}>شروط الاستخدام</Text>
          <Icon name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Icon name="information-circle-outline" size={24} color="#60a5fa" />
          <Text style={styles.rowText}>الاصدار</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>
      </View>

      {/* زر تسجيل الخروج */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Icon name="log-out-outline" size={22} color="#f87171" />
        <Text style={styles.logoutText}>تسجيل خروج</Text>
      </TouchableOpacity>

      <Text style={styles.emailText}>{session?.user?.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  content: {
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // زجاجي
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  sectionTitle: {
    color: '#60a5fa', // blue-400
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  rowText: {
    color: '#e2e8f0', // slate-300
    fontSize: 16,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    marginVertical: 4,
  },
  versionText: {
    color: '#64748b', // slate-500
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)', // red-600 شفاف
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#f87171', // red-400
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emailText: {
    color: '#475569', // slate-600
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
