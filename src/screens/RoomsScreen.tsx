import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';

type Room = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  created_by: string;
  created_at: string;
};

export default function RoomsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [onlineCounts, setOnlineCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      Alert.alert('خطأ', error.message);
      return;
    }
    
    setRooms(data || []);
    setFilteredRooms(data || []);
  }, []);

  const fetchOnlineCounts = useCallback(async () => {
    const { data } = await supabase
      .from('room_presence')
      .select('room_id');
    
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.room_id] = (counts[item.room_id] || 0) + 1;
      });
      setOnlineCounts(counts);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchOnlineCounts();

    // Realtime للغرف الجديدة
    const roomsChannel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    // Realtime للمتصلين
    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const counts: Record<string, number> = {};
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.room_id) counts[p.room_id] = (counts[p.room_id] || 0) + 1;
          });
        });
        setOnlineCounts(counts);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [fetchRooms, fetchOnlineCounts]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(room => 
        room.name.toLowerCase().includes(search.toLowerCase()) ||
        room.description?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, [search, rooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRooms(), fetchOnlineCounts()]);
    setRefreshing(false);
  };

  const renderRoom = ({ item }: { item: Room }) => {
    const onlineCount = onlineCounts[item.id] || 0;
    const isOwner = item.created_by === session?.user.id;

    return (
      <TouchableOpacity 
        style={styles.roomCard}
        onPress={() => navigation.navigate('ChatRoom', { room: item })}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/60' }} 
          style={styles.roomImage}
        />
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
            {isOwner && <Icon name="star" size={16} color="#f59e0b" />}
          </View>
          {item.description && (
            <Text style={styles.roomDesc} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={styles.roomMeta}>
            <Icon name="people" size={14} color="#10b981" />
            <Text style={styles.onlineText}>{onlineCount} متصل</Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الغرف</Text>
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateRoom')}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن غرفة..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={item => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="chatbubbles-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>لا توجد غرف</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 32, fontWeight: '800', color: '#f1f5f9' },
  createBtn: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 48, color: '#f1f5f9', fontSize: 16 },
  list: { paddingHorizontal: 20 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roomImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  roomInfo: { flex: 1 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomName: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', flex: 1 },
  roomDesc: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  onlineText: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 16 },
});
