// LoginScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, ArrowLeft, Mail, Lock } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';

import { auth } from '../services/firebaseConfig';

// משלים את תהליך החיבור בדפדפן אם נתקע
WebBrowser.maybeCompleteAuthSession();

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- הגדרות גוגל עם המפתח שלך ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '16421819020-82oc8291kgi171lnqu2cthh1kb2htkr4.apps.googleusercontent.com',
    redirectUri: 'https://auth.expo.io/@elharel648/CalmParentApp'
  });

  // האזנה לתשובה מגוגל
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      
      // יצירת אישור כניסה לפיירבס באמצעות הטוקן של גוגל
      const credential = GoogleAuthProvider.credential(id_token);
      
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          Alert.alert('הצלחה', 'התחברת עם גוגל בהצלחה!');
          onLoginSuccess();
        })
        .catch((error) => {
          console.error("Google Sign-In Error:", error);
          Alert.alert('שגיאה בהתחברות', 'לא הצלחנו לחבר את המשתמש דרך גוגל.');
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('שגיאה בגוגל', 'אירעה שגיאה בחיבור לגוגל.');
      console.error(response.error);
    }
  }, [response]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא אימייל וסיסמה');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // התחברות רגילה
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
      } else {
        // הרשמה רגילה
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        Alert.alert(
          'ההרשמה הצליחה!',
          'נשלח אליך מייל לאימות החשבון. נא לבדוק גם בתיקיית הספאם.',
          [{ text: 'הבנתי', onPress: () => onLoginSuccess() }]
        );
      }
    } catch (error: any) {
      console.error('Auth Error:', error?.code);
      let msg = 'שגיאה כללית';

      if (error.code === 'auth/invalid-credential') msg = 'הפרטים שגויים (אימייל או סיסמה).';
      if (error.code === 'auth/email-already-in-use') msg = 'האימייל הזה כבר רשום במערכת.';
      if (error.code === 'auth/invalid-email') msg = 'כתובת אימייל לא תקינה.';
      if (error.code === 'auth/weak-password') msg = 'הסיסמה חלשה מדי.';
      
      Alert.alert('שגיאה', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <LinearGradient colors={['#1e1b4b', '#4338ca']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}><Baby size={40} color="#4f46e5" /></View>
          <Text style={styles.appTitle}>הורה רגוע</Text>
          <Text style={styles.appSubtitle}>ניהול חכם ושקט להורים טריים</Text>
        </View>
        <View style={[styles.blob, { top: -50, left: -50, backgroundColor: '#6366f1' }]} />
        <View style={[styles.blob, { top: 50, right: -20, backgroundColor: '#a855f7' }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>{isLogin ? 'ברוכים השבים' : 'יצירת חשבון'}</Text>
          <Text style={styles.formSubtitle}>{isLogin ? 'הכנס פרטים כדי להמשיך' : 'הצטרפו לקהילת ההורים הרגועים'}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>אימייל</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#9ca3af" style={{ marginLeft: 10 }} />
              <TextInput 
                style={styles.input} 
                placeholder="your@email.com" 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address" 
                autoCapitalize="none" 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>סיסמה</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#9ca3af" style={{ marginLeft: 10 }} />
              <TextInput 
                style={styles.input} 
                placeholder="********" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
              />
            </View>
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
            <LinearGradient colors={['#4f46e5', '#4338ca']} style={styles.gradientBtn}>
              {loading ? <ActivityIndicator color="white" /> : 
                <Text style={styles.mainButtonText}>{isLogin ? 'התחברות' : 'הרשמה'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>או באמצעות</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            {/* כפתור גוגל */}
            <TouchableOpacity 
              style={[styles.socialBtn, !request && { opacity: 0.5 }]} 
              onPress={() => {
                if (request) {
                  promptAsync();
                } else {
                  Alert.alert('טוען...', 'החיבור לגוגל עדיין נטען, נסה שוב בעוד רגע.');
                }
              }}
              disabled={!request}
            >
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert('בקרוב', 'אפל יתווסף בהמשך')}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIcon} />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchMode}>
            <Text style={styles.switchText}>
              {isLogin ? 'עדיין אין לך חשבון? ' : 'כבר יש לך חשבון? '}
              <Text style={styles.linkText}>{isLogin ? 'הרשם עכשיו' : 'התחבר'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { height: '35%', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerContent: { alignItems: 'center', zIndex: 10 },
  iconCircle: { width: 80, height: 80, backgroundColor: 'white', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  appTitle: { fontSize: 32, fontWeight: '900', color: 'white', marginBottom: 4 },
  appSubtitle: { fontSize: 14, color: '#e0e7ff', opacity: 0.9 },
  blob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.4 },
  formContainer: { flex: 1, marginTop: -30 },
  scrollContent: { padding: 24, paddingBottom: 40, backgroundColor: 'white', marginHorizontal: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'right' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', height: 50 },
  input: { flex: 1, height: '100%', textAlign: 'right', paddingHorizontal: 12, fontSize: 15, color: '#111827' },
  mainButton: { marginTop: 10, borderRadius: 14, overflow: 'hidden', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  gradientBtn: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  mainButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  socialIcon: { width: 20, height: 20 },
  socialText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  switchMode: { alignItems: 'center' },
  switchText: { fontSize: 14, color: '#6b7280' },
  linkText: { color: '#4f46e5', fontWeight: 'bold' },
});