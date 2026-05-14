import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, StyleSheet, Alert, Modal } from 'react-native';
import { useAuth } from '../App';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';

export default function ChatRoomScreen({ route, navigation }) {
  const { room } = route.params;
  const { supabase, session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState([]);
  const [showOptions, setShowOptions] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    setIsOwner(room.created_by === session.user.id);
    fetchMessages();
    
    const msgChannel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, 
        fetchMessages
      )
      .subscribe();
    
    const typingChannel = supabase
      .channel(`typing:${room.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user !== session.user.email) {
          setTyping(p => [...new Set([...p, payload.user])]);
          setTimeout(() => setTyping(p => p.filter(u => u !== payload.user)), 2000);
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(msgChannel); 
      supabase.removeChannel(typingChannel); 
    };
  }, []);

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*,profiles(username,avatar_url)')
      .eq('room_id', room.id)
      .order('created_at');
    setMessages(data || []);
  }

  async function sendMessage(content, image_url = null) {
    if (!content && !image_url) return;
    
    const { error } = await supabase.from('messages').insert({ 
      room_id: room.id, 
      user_id: session.user.id, 
      content, 
      image_url 
    });
    
    if (!error) setText('');
  }

  async function sendImage() {
    const result = await launchImageLibrary({ 
      mediaType: 'photo', 
      quality: 0.7,
      maxWidth: 1024,
      maxHeight: 1024,
    });
    
    if (result.didCancel || !result.assets || !result.assets[0]) return;
    
    const file = result.assets[0];
    const fileExt = file.fileName?.split('.').pop() || 'jpg';
    const path = `${session.user.id}/${Date.now()}.${fileExt}`;
    
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.fileName || `photo.${fileExt}`
    });

    const { error } = await supabase.storage
      .from('chat')
      .upload(path, formData);

    if (!error) {
      const { data } = supabase.storage.from('chat').getPublicUrl(path);
      sendMessage(null, data.publicUrl);
    } else {
      Alert.alert('خطأ', 'فشل رفع الصورة');
    }
  }

  function handleTyping(t) {
    setText(t);
    supabase.channel(`typing:${room.id}`).send({ 
      type: 'broadcast', 
      event: 'typing', 
      payload: { user: session.user.email } 
    });
  }

  async function deleteMessage(id) {
    Alert.alert('حذف الرسالة', 'متأكد؟', [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('id', id);
          setShowOptions(null);
        }
      }
    ]);
  }

  async function deleteRoom() {
    Alert.alert('حذف الغرفة', 'متأكد تريد تحذف الغرفة؟ كل الرسائل راح تنحذف', [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('room_id', room.id);
          await supabase.from('rooms').delete().eq('id', room.id);
          navigation.goBack();
        }
      }
    ]);
  }

  async function editRoom() {
    Alert.prompt(
      'تعديل الغرفة',
      'اكتب الاسم الجديد',
      async (newName) => {
        if (newName && newName.trim()) {
          await supabase
            .from('rooms')
            .update({ name: newName.trim() })
            .eq('id', room.id);
          Alert.alert('تم', 'تم تحديث اسم الغرفة');
        }
      },
      'plain-text',
      room.name
    );
  }

  const renderMessage = ({ item }) => {
    const isMe = item.user_id === session.user.id;
    const canDelete = isMe || isOwner;

    return (
      <TouchableOpacity
        onLongPress={() => canDelete && setShowOptions(item.id)}
        activeOpacity={0.8}
        style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}
      >
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {!isMe && (
            <Text style={styles.username}>{item.profiles?.username || 'مستخدم'}</Text>
          )}
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
          )}
          {item.content && (
            <Text style={styles.messageText}>{item.content}</Text>
          )}
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString('ar-IQ', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>

        {showOptions === item.id && canDelete && (
          <Modal transparent visible={true} animationType="fade" onRequestClose={() => setShowOptions(null)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(null)}>
              <View style={styles.optionsMenu}>
                <TouchableOpacity style={styles.optionRow} onPress={() => deleteMessage(item.id)}>
                  <Icon name="trash-outline" size={20} color="#f87171" />
                  <Text style={[styles.optionText, { color: '#f87171' }]}>حذف الرسالة</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image 
          source={{ uri: room.image || 'https://i.pravatar.cc/100' }} 
          style={styles.roomImage} 
        />
        <View style={styles.headerInfo}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomMembers}>{messages.length} رسالة</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowOptions('room')}>
            <Icon name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* قائمة الرسائل */}
      <FlatList
        ref={flatListRef}
        data={messages}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />
      
      {/* حالة الكتابة */}
      {typing.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typing.join(', ')} يكتب...</Text>
        </View>
      )}
      
      {/* شريط الكتابة */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={sendImage}>
          <Icon name="image-outline" size={28} color="#60a5fa" />
        </TouchableOpacity>
        <TextInput 
          value={text} 
          onChangeText={handleTyping} 
          placeholder="اكتب رسالة..." 
          placeholderTextColor="#64748b" 
          style={styles.input}
          multiline
        />
        <TouchableOpacity onPress={() => sendMessage(text)} disabled={!text.trim()}>
          <Icon name="send" size={24} color={text.trim() ? "#3B82F6" : "#334155"} />
        </TouchableOpacity>
      </View>

      {/* قائمة خيارات الغرفة */}
      {showOptions === 'room' && isOwner && (
        <Modal transparent visible={true} animationType="fade" onRequestClose={() => setShowOptions(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(null)}>
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionRow} onPress={() => { editRoom(); setShowOptions(null); }}>
                <Icon name="create-outline" size={20} color="#fff" />
                <Text style={styles.optionText}>تعديل اسم الغرفة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionRow} onPress={deleteRoom}>
                <Icon name="trash-outline" size={20} color="#f87171" />
                <Text style={[styles.optionText, { color: '#f87171' }]}>حذف الغرفة</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  roomImage: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  roomName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  roomMembers: { color: '#94a3b8', fontSize: 12 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageContainer: { marginVertical: 4, maxWidth: '80%' },
  myMessage: { alignSelf: 'flex-end' },
  theirMessage: { alignSelf: 'flex-start' },
  bubble: { padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  theirBubble: { 
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  username: { color: '#60a5fa', fontSize: 12, marginBottom: 4, fontWeight: '600' },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  typingContainer: { paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { color: '#64748b', fontSize: 13, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 16,
    padding: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  optionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
