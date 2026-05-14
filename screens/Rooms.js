import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput } from 'react-native';
import { useAuth } from '../App';
import Icon from 'react-native-vector-icons/Ionicons';

export default function RoomsScreen({ navigation }) {
  const { supabase, session } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [onlineCounts, setOnlineCounts] = useState({});

  useEffect(() => {
    fetchRooms();
    fetchOnlineCounts();

    const roomsChannel = supabase
    .channel('rooms-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
    .subscribe();

    const presenceChannel = supabase
    .channel('online-users')
    .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        updateOnlineCounts(state);
      })
    .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  async function fetchRooms() {
    const { data } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false });
    setRooms(data || []);
    setFilteredRooms(data || []);
  }

  async function fetchOnlineCounts() {
    const { data } = await supabase
    .from('room_presence')
    .select('room_id');

    if (data) {
      const counts = {};
      data.forEach(item => {
        counts[item.room_id] = (counts[item.room_id] || 0) + 1;
      });
      setOnlineCounts(counts);
    }
  }

  function updateOnlineCounts(state) {
    const counts = {};
    Object.keys(state).forEach(key => {
      const presences = state[key];
      presences.forEach(p => {
        if (p.room_id) {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      });
    });
    setOnlineCounts(counts);
  }

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

  const renderRoom = ({ item }) => {
    const isOwner = item.created_by === session.user.id;
    const onlineCount = onlineCounts[item.id] || 0;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ChatRoom', { room: item })}
        style={styles.roomCard}
      >
        <Image
          source={{ uri: item.image || 'https://i.pravatar.cc/100' }}
          style={styles.roomImage}
        />
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName}>{item.name}</Text>
            {isOwner && <Icon name="star" size={16} color="#fbbf24" />}
          </View>
          <Text style={styles.roomDesc} numberOfLines={1}>
            {item.description || 'لا يوجد وصف'}
          </Text>
          <View style={styles.roomFooter}>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{onlineCount} نشط</Text>
            </View>
            {isOwner && <Text style={styles.ownerBadge}>غرفتي</Text>}
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الغرف</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateRoom')}>
          <Icon name="add-circle" size={32} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن غرفة..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(i) => i.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search? 'لا توجد نتائج' : 'لا توجد غرف بعد'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  roomImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  roomInfo: {
    marginLeft: 16,
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  roomDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    color: '#22c55e',
    fontSize: 12,
  },
  ownerBadge: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
