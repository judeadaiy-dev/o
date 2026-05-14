import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../App';
import { Ionicons } from '@expo/vector-icons';

export default function RoomsScreen({ navigation }) {
  const { supabase } = useAuth();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetchRooms();
    const channel = supabase.channel('rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchRooms() {
    const { data } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    setRooms(data || []);
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-5 pt-14 pb-4 flex-row justify-between items-center">
        <Text className="text-white text-3xl font-bold">الغرف</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateRoom')}>
          <Ionicons name="add-circle" size={32} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('ChatRoom', { room: item })} className="flex-row items-center bg-slate-900/50 mx-4 mb-3 p-4 rounded-2xl">
            <Image source={{ uri: item.image || 'https://i.pravatar.cc/100' }} className="w-14 h-14 rounded-2xl" />
            <View className="ml-4 flex-1">
              <Text className="text-white text-lg font-bold">{item.name}</Text>
              <Text className="text-slate-400 text-sm">{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
