import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';

export default function CreateRoomScreen({ navigation }: any) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (result.didCancel || result.errorCode) return;
    if (result.assets && result.assets[0]) {
      setImage(result.assets[0]);
    }
  }

  async function createRoom() {
    if (!name.trim()) {
      return Alert.alert('خطأ', 'اكتب اسم الغرفة');
    }

    if (name.trim().length < 3) {
      return Alert.alert('خطأ', 'اسم الغرفة قصير جداً');
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (image && image.base64) {
        const fileExt = image.type?.split('/')[1] || 'jpg';
        const path = `rooms/${session?.user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
        .from('rooms')
        .upload(path, decode(image.base64), {
            contentType: image.type || 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          throw new Error('فشل رفع الصورة: ' + uploadError.message);
        }

        const { data } = supabase.storage.from('rooms').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { data, error } = await supabase
      .from('rooms')
      .insert({
          name: name.trim(),
          description: desc.trim() || null,
          image: imageUrl,
          created_by: session?.user.id
        })
      .select()
      .single();

      if (error) throw error;

      Alert.alert('تم', 'تم انشاء الغرفة بنجاح', [
        {
          text: 'حسناً',
          onPress: () => navigation.replace('ChatRoom', { room: data })
        }
      ]);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios'? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#f1f5f9" />
          </TouchableOpacity>
          <Text style={styles.title}>انشاء غرفة جديدة</Text>
          <View style={{ width: 24 }} />
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera" size={48} color="#64748b" />
              <Text style={styles.imagePlaceholderText}>اضافة صورة</Text>
            </View>
          )}
          <View style={styles.imageEditBadge}>
            <Icon name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم الغرفة *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: دردشة الأصدقاء"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
            <Text style={styles.counter}>{name.length}/50</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الوصف</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="اكتب وصف مختصر للغرفة..."
              placeholderTextColor="#64748b"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{desc.length}/200</Text>
          </View>

          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              ستصبح مالك الغرفة وتستطيع طرد وحظر المستخدمين
            </Text>
          </View>

          <TouchableOpacity
            onPress={createRoom}
            disabled={loading ||!name.trim()}
            style={[styles.button, (loading ||!name.trim()) && styles.buttonDisabled]}
          >
            {loading? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="add-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>انشاء الغرفة</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#f1f5f9' },
  imagePicker: { alignSelf: 'center', marginBottom: 32, position: 'relative' },
  imagePreview: { width: 140, height: 140, borderRadius: 70 },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: { color: '#64748b', marginTop: 8, fontSize: 14 },
  imageEditBadge: {
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
  form: { gap: 20 },
  inputGroup: {},
  label: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginBottom: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#f1f5f9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  counter: { fontSize: 12, color: '#64748b', textAlign: 'left', marginTop: 4 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, color: '#93c5fd', fontSize: 14, lineHeight: 20 },
  button: {
    backgroundColor: '#3b82f6',
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
