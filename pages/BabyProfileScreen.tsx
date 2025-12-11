import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Check, User, ChevronLeft } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveBabyProfile } from '../services/babyService';

const { width } = Dimensions.get('window');

type BabyProfileScreenProps = {
  onProfileSaved: () => void;
};

export default function BabyProfileScreen({ onProfileSaved }: BabyProfileScreenProps) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [gender, setGender] = useState<'boy' | 'girl' | 'other'>('boy');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('אופס...', 'שכחת לכתוב את השם');
      return;
    }

    setLoading(true);
    try {
      await saveBabyProfile(name, birthDate, gender);
      // אנימציה קטנה או הודעה נעימה לפני המעבר
      Alert.alert('איזה כיף!', 'הפרופיל נוצר בהצלחה. בואו נתחיל!', [
        { text: 'כניסה לאפליקציה', onPress: onProfileSaved }
      ]);
    } catch (error) {
      Alert.alert('שגיאה', 'משהו השתבש בשמירה, נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* רקע עדין לכל המסך */}
      <LinearGradient colors={['#fdfbf7', '#eef2ff', '#e0e7ff']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerSpacer} />
          
          <View style={styles.titlesContainer}>
            <Text style={styles.mainTitle}>היי הורים! 👋</Text>
            <Text style={styles.subTitle}>בואו נכיר את התוספת החדשה והמתוקה למשפחה</Text>
          </View>

          {/* כרטיס הזנת שם */}
          <View style={styles.card}>
            <Text style={styles.label}>איך קוראים לנסיך/ה?</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="הקלידו שם כאן..."
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
              <View style={styles.iconBg}>
                <User size={22} color="#6366f1" />
              </View>
            </View>
          </View>

          {/* כרטיס תאריך לידה */}
          <View style={styles.card}>
            <Text style={styles.label}>תאריך לידה</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <View style={{flex: 1}}>
                <Text style={styles.dateText}>{birthDate.toLocaleDateString('he-IL')}</Text>
              </View>
              <View style={styles.iconBg}>
                <Calendar size={22} color="#6366f1" />
              </View>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {/* בחירת מין - עיצוב כפתורים גדולים */}
          <Text style={styles.sectionLabel}>מין היילוד</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity 
              style={[styles.genderCard, gender === 'boy' && styles.activeBoyCard]} 
              onPress={() => setGender('boy')}
              activeOpacity={0.8}
            >
              <Text style={styles.genderEmoji}>👶</Text>
              <Text style={[styles.genderText, gender === 'boy' && styles.activeText]}>בן</Text>
              {gender === 'boy' && <View style={styles.activeBadge}><Check size={12} color="white" /></View>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.genderCard, gender === 'girl' && styles.activeGirlCard]} 
              onPress={() => setGender('girl')}
              activeOpacity={0.8}
            >
              <Text style={styles.genderEmoji}>👧</Text>
              <Text style={[styles.genderText, gender === 'girl' && styles.activeText]}>בת</Text>
              {gender === 'girl' && <View style={styles.activeBadge}><Check size={12} color="white" /></View>}
            </TouchableOpacity>
          </View>

          {/* כפתור שמירה ראשי */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={loading}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.submitText}>שמירה והמשך</Text>
                    <ChevronLeft size={24} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  headerSpacer: { height: 60 },
  
  titlesContainer: { marginBottom: 32, alignItems: 'flex-end' },
  mainTitle: { fontSize: 34, fontWeight: '800', color: '#1e1b4b', marginBottom: 8 },
  subTitle: { fontSize: 16, color: '#6b7280', textAlign: 'right', lineHeight: 22 },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3, // צל באנדרואיד
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)'
  },
  label: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12, textAlign: 'right' },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12, textAlign: 'right', marginTop: 10 },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 18, color: '#1f2937', fontWeight: '500', paddingVertical: 8, paddingRight: 10 },
  dateButton: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 18, color: '#1f2937', fontWeight: '500', textAlign: 'right', paddingRight: 10 },
  
  iconBg: {
    width: 40,
    height: 40,
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },

  genderContainer: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  genderCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeBoyCard: { borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  activeGirlCard: { borderColor: '#f472b6', backgroundColor: '#fdf2f8' },
  
  genderEmoji: { fontSize: 32, marginBottom: 8 },
  genderText: { fontSize: 16, fontWeight: '600', color: '#9ca3af' },
  activeText: { color: '#1f2937', fontWeight: 'bold' },
  
  activeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4f46e5',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  footer: { marginTop: 10 },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  gradientBtn: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});