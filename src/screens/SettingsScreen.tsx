import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, Switch } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function SettingsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase
   .from('user_settings')
   .select('*')
   .eq('user_id', session?.user.id)
   .single();

    if (data) {
      setNotificationsEnabled(data.notifications_enabled?? true);
      setSoundEnabled(data.sound_enabled?? true);
      setVibrationEnabled(data.vibration_enabled?? true);
    }
  }

  async function updateSetting(key: string, value: boolean) {
    await supabase
   .from('user_settings')
   .upsert({
        user_id: session?.user.id,
        [key]: value,
        updated_at: new Date().toISOString()
      });
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

  async function deleteAccount() {
    Alert.alert(
      'حذف الحساب',
      'تحذير: سيتم حذف كل بياناتك نهائياً. هذا الإجراء لا يمكن التراجع عنه!',
      [
        { text: 'الغاء', style: 'cancel' },
        {
          text: 'حذف نهائي',
          style: 'destructive',
          onPress: async () => {
            Alert.prompt(
              'تأكيد الحذف',
              'اكتب "حذف" للتأكيد:',
              [
                { text: 'الغاء', style: 'cancel' },
                {
                  text: 'تأكيد',
                  style: 'destructive',
                  onPress: async (text) => {
                    if (text === 'حذف') {
                      const { error } = await supabase.rpc('delete_user_account');
                      if (error) {
                        Alert.alert('خطأ', error.message);
                      } else {
                        await supabase.auth.signOut();
                      }
                    } else {
                      Alert.alert('خطأ', 'النص غير مطابق');
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        }
      ]
    );
  }

  const SettingRow = ({ icon, title, subtitle, onPress, right }: any) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Icon name={icon} size={22} color="#3b82f6" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right || <Icon name="chevron-forward" size={20} color="#64748b" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>الإعدادات</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الحساب</Text>
        <View style={styles.card}>
          <SettingRow
            icon="person-circle-outline"
            title="الملف الشخصي"
            subtitle="تعديل معلوماتك"
            onPress={() => navigation.navigate('Profile')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="people-outline"
            title="المحظورين"
            subtitle="إدارة المستخدمين المحظورين"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            title="الايميل"
            subtitle={session?.user.email}
            onPress={undefined}
            right={<View />}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإشعارات</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            title="تفعيل الإشعارات"
            subtitle="استلام إشعارات الرسائل"
            onPress={undefined}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => {
                  setNotificationsEnabled(val);
                  updateSetting('notifications_enabled', val);
                }}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="volume-high-outline"
            title="الصوت"
            subtitle="تشغيل صوت عند وصول رسالة"
            onPress={undefined}
            right={
              <Switch
                value={soundEnabled}
                onValueChange={(val) => {
                  setSoundEnabled(val);
                  updateSetting('sound_enabled', val);
                }}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="phone-portrait-outline"
            title="الاهتزاز"
            subtitle="اهتزاز عند وصول رسالة"
            onPress={undefined}
            right={
              <Switch
                value={vibrationEnabled}
                onValueChange={(val) => {
                  setVibrationEnabled(val);
                  updateSetting('vibration_enabled', val);
                }}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>القانونية</Text>
        <View style={styles.card}>
          <SettingRow
            icon="shield-checkmark-outline"
            title="سياسة الخصوصية"
            onPress={() => Linking.openURL('https://seachat.app/privacy')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="document-text-outline"
            title="شروط الاستخدام"
            onPress={() => Linking.openURL('https://seachat.app/terms')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="help-circle-outline"
            title="المساعدة والدعم"
            onPress={() => Linking.openURL('https://seachat.app/support')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>خطر</Text>
        <View style={styles.card}>
          <SettingRow
            icon="trash-outline"
            title="حذف الحساب"
            subtitle="حذف نهائي لكل البيانات"
            onPress={deleteAccount}
            right={<Icon name="warning" size={20} color="#ef4444" />}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>تسجيل خروج</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SeaChat v1.0.0 - React Native 0.85</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#f1f5f9', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase' },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
  rowSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginHorizontal: 16 },
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
  version: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 },
});
