import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../App';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CreateRoomScreen({ navigation }) {
  const { supabase, session } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.5,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.didCancel || result.errorCode) return;
    if (result.assets && result.assets[0]) {
      setImage(result.assets[0]);
    }
  }

  async function createRoom() {
    if (!name.trim()) return Alert.alert('خطأ', 'اكتب اسم الغرفة');
    setLoading(true);

    let imageUrl = null;
    if (image && image.base64) {
      const fileExt = image.type?.split('/')[1] || 'jpg';
      const path = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
       .from('rooms')
       .upload(path, decode(image.base64), {
          contentType: image.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        setLoading(false);
        return Alert.alert('خطأ', 'فشل رفع الصورة: ' + uploadError.message);
      }

      const { data } = supabase.storage.from('rooms').getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const { error } = await supabase
     .from('rooms')
     .insert({
        name: name.trim(),
        description: desc.trim() || null,
        image: imageUrl,
        created_by: session.user.id
      });

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      Alert.alert('تم', 'تم انشاء الغرفة بنجاح');
      navigation.goBack();
    }
    setLoading(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>غرفة جديدة</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image? (
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="camera-outline" size={40} color="#64748b" />
            <Text style={styles.imagePlaceholderText}>اختر صورة الغرفة</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>اسم الغرفة *</Text>
      <TextInput
        style={styles.input}
        placeholder="مثال: عشاق البرمجة"
        placeholderTextColor="#64748b"
        value={name}
        onChangeText={setName}
        maxLength={50}
      />

      <Text style={styles.label}>الوصف</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="اكتب وصف للغرفة..."
        placeholderTextColor="#64748b"
        value={desc}
        onChangeText={setDesc}
        multiline
        numberOfLines={4}
        maxLength={200}
      />

      <TouchableOpacity
        onPress={createRoom}
        disabled={loading ||!name.trim()}
        style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {loading? 'جاري الانشاء...' : 'انشاء الغرفة'}
        </Text>
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
  imagePicker: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // زجاجي
    height: 160,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#64748b', // slate-500
    fontSize: 16,
  },
  label: {
    color: '#e2e8f0', // slate-300
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // زجاجي
    color: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2563eb', // blue-600
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1e293b', // slate-800
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
