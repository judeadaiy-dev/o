import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import CryptoJS from 'crypto-js';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';

const ENCRYPTION_KEY = 'SeaChat2026SecretKeyV2';

type DirectMessage = {
  id: string;
  content: string;
  image_url: string | null;
  sender_id: string;
  created_at: string;
  edited: boolean;
  read: boolean;
};

export default function DirectChatScreen({ route, navigation }: any) {
  const { conversationId, otherUser } = route.params;
  const { session } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const encrypt = (text: string) => CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  const decrypt = (ciphertext: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '[رسالة مشفرة]';
    }
  };

  useEffect(() => {
    checkBlockStatus();
    fetchMessages();
    markAsRead();

    const channel = supabase
     .channel(`chat:${conversationId}`)
     .on('postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          fetchMessages();
          markAsRead();
        }
      )
     .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function checkBlockStatus() {
    const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
      supabase.from('blocks')
       .select('*')
       .eq('blocker_id', session?.user.id)
       .eq('blocked_id', otherUser.id)
       .single(),
      supabase.from('blocks')
       .select('*')
       .eq('blocker_id', otherUser.id)
       .eq('blocked_id', session?.user.id)
       .single()
    ]);

    setIsBlocked(!!iBlocked);
    setIsBlockedByThem(!!theyBlocked);
  }

  async function fetchMessages() {
    const { data, error } = await supabase
     .from('direct_messages')
     .select('*')
     .eq('conversation_id', conversationId)
     .order('created_at', { ascending: true });

    if (!error && data) {
      const decrypted = data.map(msg => ({
       ...msg,
        content: msg.content? decrypt(msg.content) : null
      }));
      setMessages(decrypted);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function markAsRead() {
    await supabase.from('direct_messages')
     .update({ read: true })
     .eq('conversation_id', conversationId)
     .neq('sender_id', session?.user.id)
     .eq('read', false);
  }

  async function sendMessage(content: string, image_url: string | null = null) {
    if (!content.trim() &&!image_url) return;
    if (isBlocked) return Alert.alert('محظور', 'لا يمكنك ارسال رسائل لهذا المستخدم');
    if (isBlockedByThem) return Alert.alert('محظور', 'هذا المستخدم قام بحظرك');

    const encrypted = content? encrypt(content.trim()) : null;

    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: conversationId,
      sender_id: session?.user.id,
      content: encrypted,
      image_url
    });

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      setText('');
      // إنشاء إشعار
      await supabase.from('notifications').insert({
        user_id: otherUser.id,
        type: 'message',
        title: session?.user.email,
        body: content || 'أرسل صورة',
        data: { conversationId, type: 'direct' }
      });
    }
  }

  async function pickImage() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
    });

    if (result.didCancel ||!result.assets?.[0]?.base64) return;

    setUploading(true);
    const asset = result.assets[0];
    const fileExt = asset.type?.split('/')[1] || 'jpg';
    const path = `direct/${conversationId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
     .from('messages')
     .upload(path, decode(asset.base64), {
        contentType: asset.type || 'image/jpeg'
      });

    if (error) {
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
          await supabase.from('direct_messages').delete().eq('id', messageId);
          setShowOptions(null);
        }
      }
    ]);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    const encrypted = encrypt(editText.trim());
    await supabase.from('direct_messages')
     .update({ content: encrypted, edited: true })
     .eq('id', editingId);
    setEditingId(null);
    setEditText('');
  }

  async function toggleBlock() {
    if (isBlocked) {
      await supabase.from('blocks')
       .delete()
       .eq('blocker_id', session?.user.id)
       .eq('blocked_id', otherUser.id);
      setIsBlocked(false);
      Alert.alert('تم', 'تم الغاء الحظر');
    } else {
      Alert.alert('حظر المستخدم', `حظر ${otherUser.username}؟`, [
        { text: 'الغاء' },
        {
          text: 'حظر',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('blocks').insert({
              blocker_id: session?.user.id,
              blocked_id: otherUser.id
            });
            setIsBlocked(true);
            Alert.alert('تم', 'تم حظر المستخدم');
          }
        }
      ]);
    }
  }

  async function reportUser() {
    Alert.prompt('تبليغ عن مستخدم', 'سبب التبليغ:', [
      { text: 'الغاء', style: 'cancel' },
      {
        text: 'تبليغ',
        onPress: async (reason) => {
          if (!reason) return;
          await supabase.from('reports').insert({
            reporter_id: session?.user.id,
            reported_id: otherUser.id,
            reason
          });
          Alert.alert('تم', 'تم ارسال التبليغ');
        }
      }
    ], 'plain-text');
  }

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isMe = item.sender_id === session?.user.id;

    return (
      <TouchableOpacity
        onLongPress={() => setShowOptions(showOptions === item.id? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
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
                  {isMe && (
                    <Icon
                      name={item.read? "checkmark-done" : "checkmark"}
                      size={14}
                      color={item.read? "#3b82f6" : "#94a3b8"}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        {showOptions === item.id && isMe && (
          <View style={styles.optionsMenu}>
            {!item.image_url && (
              <TouchableOpacity style={styles.optionBtn} onPress={() => {
                setEditingId(item.id);
                setEditText(item.content || '');
                setShowOptions(null);
              }}>
                <Icon name="create-outline" size={18} color="#60a5fa" />
                <Text style={styles.optionText}>تعديل</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.optionBtn} onPress={() => deleteMessage(item.id)}>
              <Icon name="trash-outline" size={18} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>حذف</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: otherUser.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerTitle}>{otherUser.username}</Text>
            {isBlocked && <Text style={styles.blockedText}>محظور</Text>}
          </View>
        <TouchableOpacity onPress={() => {
          Alert.alert('خيارات', '', [
            { text: isBlocked? 'الغاء الحظر' : 'حظر', onPress: toggleBlock, style: isBlocked? 'default' : 'destructive' },
            { text: 'تبليغ', onPress: reportUser, style: 'destructive' },
            { text: 'الغاء', style: 'cancel' }
          ]);
        }}>
          <Icon name="ellipsis-vertical" size={24} color="#f1f5f9" />
        </TouchableOpacity>
      </View>

      {isBlockedByThem && (
        <View style={styles.blockedBanner}>
          <Icon name="ban" size={20} color="#ef4444" />
          <Text style={styles.blockedBannerText}>هذا المستخدم قام بحظرك</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} disabled={uploading || isBlocked || isBlockedByThem}>
          {uploading? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <Icon name="image-outline" size={24} color={isBlocked || isBlockedByThem? "#475569" : "#3b82f6"} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, (isBlocked || isBlockedByThem) && styles.inputDisabled]}
          placeholder={isBlocked? "محظور" : isBlockedByThem? "تم حظرك" : "اكتب رسالة..."}
          placeholderTextColor="#64748b"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!isBlocked &&!isBlockedByThem}
        />
        <TouchableOpacity
          onPress={() => sendMessage(text)}
          disabled={!text.trim() || isBlocked || isBlockedByThem}
          style={[styles.sendBtn, (!text.trim() || isBlocked || isBlockedByThem) && styles.sendBtnDisabled]}
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginLeft: 16 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  blockedText: { fontSize: 12, color: '#ef4444' },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7f1d1d',
    padding: 12,
    justifyContent: 'center',
  },
  blockedBannerText: { color: '#fecaca', fontWeight: '600' },
  messagesList: { padding: 16 },
  messageRow: { marginBottom: 12, alignItems: 'flex-start' },
  messageRowMe: { alignItems: 'flex-end' },
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
  messageText: { fontSize: 15, color: '#f1f5f9', lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageFooter: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
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
    alignSelf: 'flex-end',
    marginTop: 4,
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6 },
  optionText: { fontSize: 13, color: '#f1f5f9', fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  input
