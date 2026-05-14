import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from '../App';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function CreateRoomScreen({ navigation }) {
  const { supabase, session } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
    if (!result.canceled) setImage(result.assets[0]);
  }

  async function createRoom() {
    if (!name) return Alert.alert('خطأ', 'اكتب اسم الغرفة');
    setLoading(true);
    let imageUrl = null;
    if (image) {
      const path = `${session.user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('rooms').upload(path, decode(image.base64), { contentType: 'image/jpeg' });
      if (!error) imageUrl = supabase.storage.from('rooms').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('rooms').insert({ name, description: desc, image: imageUrl, created_by: session.user.id });
    if (error) Alert.alert('خطأ', error.message);
    else navigation.goBack();
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-slate-950 p-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">غرفة جديدة</Text>
      <TouchableOpacity onPress={pickImage} className="bg-slate-800 h-32 rounded-2xl justify-center items-center mb-4">
        {image? <Image source={{ uri: image.uri }} className="w-full h-full rounded-2xl" /> : <Text className="text-slate-400">اختر صورة</Text>}
      </TouchableOpacity>
      <TextInput className="bg-slate-800 text-white p-4 rounded-xl mb-4" placeholder="اسم الغرفة" placeholderTextColor="#64748b" value={name} onChangeText={setName} />
      <TextInput className="bg-slate-800 text-white p-4 rounded-xl mb-6" placeholder="الوصف" placeholderTextColor="#64748b" value={desc} onChangeText={setDesc} multiline />
      <TouchableOpacity onPress={createRoom} disabled={loading} className="bg-blue-600 p-4 rounded-xl">
        <Text className="text-white text-center font-bold text-lg">{loading? '...' : 'انشاء'}</Text>
      </TouchableOpacity>
    </View>
  );
    }
