import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../App';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'SeaChat2026SecretKey';

export default function DirectChatScreen({ route, navigation }) {
  const { conversationId, otherUser } = route.params;
  const { supabase, session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showOptions, setShowOptions] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    checkBlockStatus();
    fetchMessages();
    
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, 
        fetchMessages
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function checkBlockStatus() {
    // هل اني حاظره؟
    const { data: iBlocked } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', session.user.id)
      .eq('blocked_id', otherUser.id)
      .single();
    
    // هل هو حاظرني؟
    const { data: theyBlocked } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', otherUser.id)
      .eq('blocked_id', session.user.id)
      .single();

    setIsBlocked(!!iBlocked);
    setIsBlockedByThem(!!theyBlocked);
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      const decrypted = data.map(msg => ({
        ...msg,
        message: msg.message && !msg.is_deleted ? decryptMessage(msg.message) : null
      }));
      setMessages(decrypted);
    }
  }

  function encryptMessage(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  function decryptMessage(cipher) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '[رسالة مشفرة]';
    }
  }

  async function sendMessage() {
    if (!text.trim() || isBlocked || isBlockedByThem) return;

    const encrypted = encryptMessage(text.trim());
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        message: encrypted
      });

    if (!error) {
      await supabase
        .from('conversations')
        .update({ 
          last_message: text.trim().slice(0, 50), 
          last_message_at: new Date().toISOString() 
        })
        .eq('id', conversationId);
      setText('');
    }
  }

  async function deleteMessage(id) {
    Alert.alert('حذف الرسالة', 'متأكد تريد تحذفها؟', [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('direct_messages')
            .update({ is_deleted: true, message: null })
            .eq('id', id);
          setShowOptions(null);
        }
      }
    ]);
  }

  async function editMessage(id) {
    if (!editText.trim()) return;
    const encrypted = encryptMessage(editText.trim());
    await supabase
      .from('direct_messages')
      .update({ message: encrypted, is_edited: true })
      .eq('id', id);
    setEditingId(null);
    setEditText('');
    setShowOptions(null);
  }

  async function blockUser() {
    Alert.alert('حظر المستخدم', `متأكد تريد حظر ${otherUser.username}؟ ما يكدر يراسلك بعد`, [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'حظر',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('blocks')
            .insert({ blocker_id: session.user.id, blocked_id: otherUser.id });
          setIsBlocked(true);
          Alert.alert('تم', 'تم حظر المستخدم');
        }
      }
    ]);
  }

  async function unblockUser() {
    await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', session.user.id)
      .eq('blocked_id', otherUser.id);
    setIsBlocked(false);
    Alert.alert('تم', 'تم الغاء الحظر');
  }

  async function reportUser(messageId = null) {
    Alert.prompt(
      'ابلاغ عن المستخدم',
      'اكتب سبب الابلاغ',
      async (reason) => {
        if (reason && reason.trim()) {
          await supabase
            .from('reports')
            .insert({
              reporter_id: session.user.id,
              reported_id: otherUser.id,
              reason: reason.trim(),
              message_id: messageId
            });
          Alert.alert('تم', 'تم ارسال البلاغ للادارة');
          setShowOptions(null);
        }
      }
    );
  }

  async function sendImage() {
    if (isBlocked || isBlockedByThem) return;
    
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
      .from('chat-images')
      .upload(path, formData);

    if (!error) {
      const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
      await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          image_url: data.publicUrl
        });
    } else {
      Alert.alert('خطأ', 'فشل رفع الصورة');
    }
  }

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === session.user.id;
    const isDeleted = item.is_deleted;

    if (isDeleted) {
      return (
        <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
          <View style={styles.deletedBubble}>
            <Icon name="trash-outline" size={14} color="#64748b" />
            <Text style={styles.deletedText}>تم حذف الرسالة</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => setShowOptions(item.id)}
        activeOpacity={0.8}
        style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}
      >
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
          )}
          {item.message && (
            <Text style={styles.messageText}>{item.message}</Text>
          )}
          <View style={styles.messageFooter}>
            {item.is_edited && <Text style={styles.editedText}>معدلة</Text>}
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {showOptions === item.id && (
          <Modal transparent visible={true} animationType="fade" onRequestClose={() => setShowOptions(null)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(null)}>
              <View style={styles.optionsMenu}>
                {isMe && !item.image_url && (
                  <TouchableOpacity style={styles.optionRow} onPress={() => {
                    setEditingId(item.id);
                    setEditText(item.message);
                    setShowOptions(null);
                  }}>
                    <Icon name="create-outline" size={20} color="#fff" />
                    <Text style={styles.optionText}>تعديل</Text>
                  </TouchableOpacity>
                )}
                {isMe && (
                  <TouchableOpacity style={styles.optionRow} onPress={() => deleteMessage(item.id)}>
                    <Icon name="trash-outline" size={20} color="#f87171" />
                    <Text style={[styles.optionText, { color: '#f87171' }]}>حذف</Text>
                  </TouchableOpacity>
                )}
                {!isMe && (
                  <TouchableOpacity style={styles.optionRow} onPress={() => reportUser(item.id)}>
                    <Icon name="flag-outline" size={20} color="#fbbf24" />
                    <Text style={[styles.optionText, { color: '#fbbf24' }]}>ابلاغ عن الرسالة</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerUserInfo}
          onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id })}
        >
          <Image 
            source={{ uri: otherUser.avatar_url || 'https://i.pravatar.cc/100' }} 
            style={styles.headerAvatar} 
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser.username || 'مستخدم'}</Text>
            <Text style={styles.headerStatus}>
              {isBlockedByThem ? 'قام بحظرك' : isBlocked ? 'محظور' : 'نشط الان'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={isBlocked ? unblockUser : blockUser}>
          <Icon name={isBlocked ? "ban" : "ban-outline"} size={24} color="#f87171" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {editingId && (
        <View style={styles.editBar}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            placeholder="عدل رسالتك..."
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity onPress={() => editMessage(editingId)}>
            <Icon name="checkmark-circle" size={28} color="#22c55e" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditingId(null); setEditText(''); }}>
            <Icon name="close-circle" size={28} color="#f87171" />
          </TouchableOpacity>
        </View>
      )}

      {!editingId && (
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={sendImage} disabled={isBlocked || isBlockedByThem}>
            <Icon name="image-outline" size={26} color={isBlocked || isBlockedByThem ? "#334155" : "#60a5fa"} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={
              isBlockedByThem ? "لا يمكن المراسلة - قام بحظرك" : 
              isBlocked ? "لا يمكن المراسلة - قمت بحظره" : 
              "اكتب رسالة..."
            }
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
            multiline
            editable={!isBlocked && !isBlockedByThem}
          />
          <TouchableOpacity onPress={sendMessage} disabled={!text.trim() || isBlocked || isBlockedByThem}>
            <Icon name="send" size={24} color={text.trim() && !isBlocked && !isBlockedByThem ? "#3B82F6" : "#334155"} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  headerUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerStatus: { color: '#22c55e', fontSize: 12 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 8 },
  myMessageRow: { alignItems: 'flex-end' },
  theirMessageRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  theirBubble: { 
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  messageText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageFooter: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center', justifyContent: 'flex-end' },
  editedText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontStyle: 'italic' },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  deletedText: { color: '#64748b', fontSize: 13, fontStyle: 'italic' },
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
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.3)',
  },
  editInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
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
