// pages/SubscriptionScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ChevronRight, DollarSign, Zap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native'; 

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  
  // 🔑 פונקציה לטיפול בלחיצה על כפתור השדרוג
  const handleUpgrade = (planName: string) => {
    // 🚨 TODO: כאן תתבצע האינטגרציה האמיתית למערכת תשלום (Stripe/In-App Purchase)
    
    Alert.alert(
      "🎉 כל הכבוד!", 
      `נלקח לתשלום עבור תוכנית ${planName}. תודה על השדרוג!`
    );
    
    // לאחר מכן, חוזרים למסך הבית (או לדוחות)
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* כפתור חזור פשוט (כי זה Stack Navigator) */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>חזור</Text>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>💰 בחר את תוכנית "הורה רגוע"</Text>
        <Text style={styles.subHeader}>
          שדרג עכשיו כדי לפתוח: תובנות AI חכמות, הוספת מטפלים ודוחות גן!
        </Text>
        
        {/* כרטיס פרימיום */}
        <View style={styles.planCard}>
            <View style={styles.planHeader}>
                <Zap color="#4f46e5" size={24} />
                <Text style={styles.planTitle}>הורה רגוע+</Text>
            </View>
            <Text style={styles.planPrice}>19.90 ₪ / חודש</Text>
            <Text style={styles.planFeature}>✓ Second Brain (תובנות AI)</Text>
            <Text style={styles.planFeature}>✓ עד 4 מטפלים משותפים</Text>
            <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => handleUpgrade('Premium')} // 🔑 הוספת הלוגיקה
            >
                <Text style={styles.upgradeButtonText}>שדרג עכשיו</Text>
                <ChevronRight color="#fff" size={20} />
            </TouchableOpacity>
        </View>

        {/* כרטיס Family / Pro */}
        <View style={[styles.planCard, styles.planRecommended]}>
             <View style={styles.planHeader}>
                <DollarSign color="#111827" size={24} />
                <Text style={styles.planTitle}>Family / Pro</Text>
            </View>
            <Text style={styles.planPrice}>39.90 ₪ / חודש</Text>
            <Text style={styles.planFeature}>✓ כל הפיצ'רים פתוחים</Text>
            <Text style={styles.planFeature}>✓ שיתוף עם גן (מודול B2B)</Text>
            <TouchableOpacity 
                style={[styles.upgradeButton, styles.upgradeButtonRecommended]}
                onPress={() => handleUpgrade('Family/Pro')} // 🔑 הוספת הלוגיקה
            >
                <Text style={styles.upgradeButtonText}>הצעה מומלצת!</Text>
                <ChevronRight color="#fff" size={20} />
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 20 },
  backButton: { alignSelf: 'flex-end', padding: 10, marginBottom: 10 },
  backButtonText: { color: '#4f46e5', fontSize: 16 },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'right', marginBottom: 10, color: '#111827' },
  subHeader: { fontSize: 16, textAlign: 'right', marginBottom: 30, color: '#6b7280' },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  planRecommended: {
    borderColor: '#4f46e5',
  },
  planHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  planTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginRight: 10 },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#4f46e5', marginBottom: 15, textAlign: 'right' },
  planFeature: { fontSize: 16, color: '#374151', marginBottom: 5, textAlign: 'right' },
  upgradeButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  upgradeButtonRecommended: {
    backgroundColor: '#059669', // ירוק יותר בולט
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  }
});