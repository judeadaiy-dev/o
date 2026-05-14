import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../App';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function ChatRoomScreen({ route, navigation }) {
  const { room } = route.params;
  const { supabase, session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState([]);
  const flatListRef = useRef();

  useEffect(() => {
    fetchMessages();
    const msgChannel = supabase.channel(`room:${room.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, payload => {
      setMessages(prev => [...prev, payload.new]);
    }).subscribe();
    
    const typingChannel = supabase.channel(`typing:${room.id}`).on('broadcast', { event: 'typing' }, ({ payload }) => {
      setTyping(p => [...new Set([...p, payload.user])]);
      setTimeout(() => setTyping(p => p.filter(u => u!== payload.user)), 2000);
    }).subscribe();

    return () => { supabase.removeChannel(msgChannel); supabase.removeChannel(typingChannel); };
  }, []);

  async function fetchMessages() {
    const { data } = await supabase.from('messages').select('*,profiles(username,avatar)').eq('room_id', room.id).order('created_at');
    setMessages(data || []);
  }

  async function sendMessage(content, image_url = null) {
    if (!content &&!image_url) return;
    await supabase.from('messages').insert({ room_id: room.id, user_id: session.user.id, content, image_url });
    setText('');
  }

  async function sendImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
    if (!result.canceled) {
      const path = `${session.user.id}/${Date.now()}.jpg`;
      await supabase.storage.from('chat').upload(path, decode(result.assets[0].base64), { contentType: 'image/jpeg' });
      const url = supabase.storage.from('chat').getPublicUrl(path).data.publicUrl;
      sendMessage(null, url);
    }
  }

  function handleTyping(t) {
    setText(t);
    supabase.channel(`typing:${room.id}`).send({ type: 'broadcast', event: 'typing', payload: { user: session.user.email } });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios'? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <View className="pt-14 pb-4 px-4 bg-slate-900 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
        <Image source={{ uri: room.image || 'https://i.pravatar.cc/100' }} className="w-10 h-10 rounded-full ml-4" />
        <Text className="text-white text-xl font-bold ml-3">{room.name}</Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View className={`p-3 mx-4 my-1 rounded-2xl max-w-[80%] ${item.user_id === session.user.id? 'bg-blue-600 self-end' : 'bg-slate-800 self-start'}`}>
            {item.user_id!== session.user.id && <Text className="text-blue-400 text-xs mb-1">{item.profiles?.username}</Text>}
            {item.image_url && <Image source={{ uri: item.image_url }} className="w-48 h-48 rounded-xl mb-2" />}
            {item.content && <Text className="text-white">{item.content}</Text>}
          </View>
        )}
      />
      {typing.length > 0 && <Text className="text-slate-400 px-4 pb-1">{typing.join(', ')} يكتب...</Text>}
      
      <View className="flex-row items-center p-4 bg-slate-900">
        <TouchableOpacity onPress={sendImage} className="mr-3"><Ionicons name="image" size={28} color="#3B82F6" /></TouchableOpacity>
        <TextInput value={text} on
