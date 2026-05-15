import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';

type Message = {
  id: string;
  content: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
  edited: boolean;
  profiles: { username: string; avatar_url: string | null };
};

type Room = {
  id: string;
  name: string;
  created_by: string;
};

export default function ChatRoomScreen({ route, navigation }: any) {
  const { room }: { room: Room } = route.params;
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setIsOwner(room.created_by === session?.user.id);
    checkBanStatus();
    fetchMessages();
    trackPresence();

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
        if (payload.user!== session?.user.email) {
          setTyping(p => [...new Set([...p, payload.user])]);
          setTimeout(() => setTyping(p => p.filter(u => u!== payload.user)), 3000);
        }
      })
     .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      untrackPresence();
    };
  }, []);

  async function checkBanStatus() {
    const { data } = await supabase
     .from('room_bans')
     .select('*')
     .eq('room_id', room.id)
     .eq('user_id', session?.user.id)
     .single();

    if (data) {
      setIsBanned(true);
      Alert.alert('محظور', 'تم حظرك من هذه الغرفة', [
        { text: 'حسناً', onPress: () => navigation.goBack() }
      ]);
    }
  }

  async function trackPresence() {
    await supabase.from('room_presence').upsert({
      room_id: room.id,
      user_id: session?.user.id,
      last_seen: new Date().toISOString()
    });
  }

  async function untrackPresence() {
    await supabase.from('room_presence')
     .delete()
     .eq('room_id', room.id)
     .eq('user_id', session?.user.id);
  }

  async function fetchMessages() {
    const { data, error } = await supabase
     .from('messages')
     .select('*, profiles(username, avatar_url)')
     .eq('room_id', room.id)
     .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data as Message[]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function sendMessage(content: string, image_url: string | null = null) {
    if (!content.trim() &&!image_url) return;
    if (isBanned) return Alert.alert('محظور', 'لا يمكنك الإرسال');

    const { error } = await supabase.from('messages').insert({
      room_id: room.id,
      user_id: session?.user.id,
      content: content.trim() || null,
      image_url
    });

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      setText('');
      // إرسال إشعار للمتصلين
      await supabase.channel(`typing:${room.id}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { user: session?.user.email }
      });
    }
  }

  async function pickImage() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1024,
    });

    if (result.didCancel || result.errorCode ||!result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploading(true);
    const fileExt = asset.type?.split('/')[1] || 'jpg';
    const path = `${room.id}/${session?.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
     .from('messages')
     .upload(path, decode(asset.base64), {
        contentType: asset.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      Alert.alert('خطأ', 'فشل رفع الصورة');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('messages').getPublicUrl(path);
    await sendMessage('', data.publicUrl);
    setUploading(false);
  }

  async function deleteMessage(messageId: string) {
    Alert.alert('حذف الرسالة', 'متأكد؟', [
      { text: 'الغاء' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('id', messageId);
          setShowOptions(null);
        }
      }
    ]);
  }

  async function startEdit(message: Message) {
    setEditingId(message.id);
    setEditText(message.content || '');
    setShowOptions(null);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    await supabase.from('messages')
     .update({ content: editText.trim(), edited: true })
     .eq('id', editingId);
    setEditingId(null);
    setEditText('');
  }

  async function reportMessage(message: Message) {
    Alert.prompt(
      'تبليغ عن رسالة',
      'سبب التبليغ:',
      [
        { text: 'الغاء', style: 'cancel' },
        {
          text: 'تبليغ',
          onPress: async (reason) => {
            if (!reason) return;
            await supabase.from('reports').insert({
              reporter_id: session?.user.id,
              reported_id: message.user_id,
              room_id: room.id,
              message_id: message.id,
              reason
            });
            Alert.alert('تم', 'تم ارسال التبليغ');
            setShowOptions(null);
          }
        }
      ],
      'plain-text'
    );
  }

  async function banUser(userId: string, username: string) {
    if (!isOwner) return;
    Alert.prompt(
      'حظر مستخدم',
      `سبب حظر ${username}:`,
      [
        { text: 'الغاء', style: 'cancel' },
        {
          text: 'حظر',
          style: 'destructive',
          onPress: async (reason) => {
            await supabase.from('room_bans').insert({
              room_id: room.id,
              user_id: userId,
              banned_by: session?.user.id,
              reason: reason || 'مخالفة القوانين'
            });
            Alert.alert('تم', 'تم حظر المستخدم');
            setShowOptions(null);
          }
        }
      ],
      'plain-text'
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.user_id === session?.user.id;
    const canModerate = isOwner || isMe;

    return (
      <TouchableOpacity
        onLongPress={() => setShowOptions(showOptions === item.id? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          {!isMe && (
            <Image
              source={{ uri: item.profiles.avatar_url || 'https://via.placeholder.com/40' }}
              style={styles.avatar}
            />
          )}
          <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
            {!isMe && <Text style={styles.username}>{item.profiles.username}</Text>}

            {editingId === item.id? (
              <View>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelText}>الغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEdit}>
                    <Text style={styles.saveText}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.messageImage} />
                )}
                {item.content && (
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {item.content}
                  </Text>
                )}
                <View style={styles.messageFooter}>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {item.edited && <Text style={styles.editedText}>معدل</Text>}
                </View>
              </>
            )}
          </View>
        </View>

        {showOptions === item.id && (
          <View style={[styles.optionsMenu, isMe && styles.optionsMenuMe]}>
            {isMe &&!item.image_url && (
              <TouchableOpacity style={styles.optionBtn} onPress={() => startEdit(item)}>
                <Icon name="create-outline" size={18} color="#60a5fa" />
                <Text style={styles.optionText}>تعديل</Text>
              </TouchableOpacity>
            )}
            {canModerate && (
              <TouchableOpacity style={styles.optionBtn} onPress={() => deleteMessage(item.id)}>
                <Icon name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>حذف</Text>
              </TouchableOpacity>
            )}
            {!isMe && (
              <TouchableOpacity style={styles.optionBtn} onPress={() => reportMessage(item)}>
                <Icon name="flag-outline" size={18} color="#f59e0b" />
                <Text style={[styles.optionText, { color: '#f59e0b' }]}>تبليغ</Text>
              </TouchableOpacity>
            )}
            {isOwner &&!isMe && (
              <TouchableOpacity style={styles.optionBtn} onPress={() => banUser(item.user_id, item.profiles.username)}>
                <Icon name="ban" size={18} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>حظر</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isBanned) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios'? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{room.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {typing.length > 0 && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{typing.join(', ')} يكتب...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} disabled={uploading}>
          {uploading? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <Icon name="image-outline" size={24} color="#3b82f6" />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="اكتب رسالة..."
          placeholderTextColor="#64748b"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={() => sendMessage(text)}
          disabled={!text.trim() &&!uploading}
          style={[styles.sendBtn, (!text.trim() &&!uploading) && styles.sendBtnDisabled]}
        >
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  messagesList: { padding: 16 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    borderBottomLeftRadius: 4,
  },
  messageBubbleMe: {
    backgroundColor: '#3b82f6',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  username: { fontSize: 13, fontWeight: '600', color: '#60a5fa', marginBottom: 4 },
  messageText: { fontSize: 15, color: '#f1f5f9', lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageFooter: { flexDirection: 'row', gap: 8, marginTop: 4 },
  messageTime: { fontSize: 11, color: '#94a3b8' },
  editedText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  editInput: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    padding: 8,
    borderRadius: 8,
    minHeight: 60,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveText: { color: '#3b82f6', fontWeight: '700' },
  optionsMenu: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    marginLeft: 48,
    marginTop: 4,
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  optionsMenuMe: { alignSelf: 'flex-end', marginLeft: 0, marginRight: 0 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6 },
  optionText: { fontSize: 13, color: '#f1f5f9', fontWeight: '600' },
  typingIndicator: { padding: 8, paddingHorizontal: 16 },
  typingText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f1f5f9',
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
