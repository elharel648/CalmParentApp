import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = ({ route, navigation }) => {
  // קבלת פרטי הבייביסיטר מהניווט, או ברירת מחדל אם אין
  const { sitterName, sitterImage } = route.params || { sitterName: 'בייביסיטר', sitterImage: null };
  const [message, setMessage] = useState('');
  
  // הודעות דמה להתחלה
  const [messages, setMessages] = useState([
    { id: 1, text: 'היי! ראיתי את הפרופיל שלך ואשמח לבדוק זמינות להיום בערב.', sender: 'me', time: '18:30' },
    { id: 2, text: `היי! בטח, אני פנויה החל מ-19:00. איפה אתם גרים?`, sender: 'other', time: '18:32' },
  ]);

  const sendMessage = () => {
    if (message.trim().length > 0) {
      setMessages([...messages, { id: Date.now(), text: message, sender: 'me', time: '18:35' }]);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-forward" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{sitterName}</Text>
              <View style={styles.statusDot} />
          </View>
          <Image source={{uri: sitterImage || 'https://via.placeholder.com/50'}} style={styles.avatar} />
      </View>

      {/* Messages List */}
      <FlatList
        data={[...messages].reverse()} // כדי שההודעה החדשה תהיה למטה
        inverted
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender === 'me' ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.msgText, item.sender === 'me' ? styles.myText : styles.otherText]}>{item.text}</Text>
            </View>
        )}
      />

      {/* Input Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={10}>
          <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                  <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
              <TextInput 
                  style={styles.input} 
                  placeholder="כתוב הודעה..." 
                  value={message}
                  onChangeText={setMessage}
                  textAlign="right"
              />
          </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
      paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff',
      shadowColor: '#000', shadowOpacity: 0.05, elevation: 5
  },
  headerInfo: { alignItems: 'center' },
  headerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginTop: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  
  listContent: { padding: 20 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-start', backgroundColor: '#4f46e5', borderBottomLeftRadius: 0 }, // צד שמאל (אני) בעברית
  otherBubble: { alignSelf: 'flex-end', backgroundColor: '#fff', borderBottomRightRadius: 0 }, // צד ימין (היא)
  
  msgText: { fontSize: 16 },
  myText: { color: '#fff' },
  otherText: { color: '#333' },

  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', alignItems: 'center', gap: 10 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, fontSize: 16, textAlign: 'right' },
  sendBtn: { width: 45, height: 45, backgroundColor: '#4f46e5', borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' }
});

export default ChatScreen;