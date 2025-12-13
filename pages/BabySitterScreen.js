import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Dimensions, Alert, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // המפות החדשות!

const { width, height } = Dimensions.get('window');

// --- נתוני Mock משודרגים (עם קואורדינטות ותגי Super Sitter) ---
const initialSitters = [
  { 
    id: 1, 
    name: 'נועה כהן', 
    age: 24, 
    price: 55, 
    distance: 0.8, 
    rating: 5.0, 
    reviews: 52, 
    isAvailable: true, 
    isSuperSitter: true, // 🌟 הפיצ'ר החדש
    image: 'https://randomuser.me/api/portraits/women/44.jpg', 
    bio: 'סטודנטית לחינוך, מומחית לגיל הרך 🧸',
    coordinate: { latitude: 32.0853, longitude: 34.7818 } // תל אביב מרכז
  },
  { 
    id: 2, 
    name: 'מאיה לוי', 
    age: 22, 
    price: 50, 
    distance: 2.1, 
    rating: 4.8, 
    reviews: 15, 
    isAvailable: true, 
    isSuperSitter: false,
    image: 'https://randomuser.me/api/portraits/women/68.jpg', 
    bio: 'חיילת משוחררת עם המון סבלנות 🎨',
    coordinate: { latitude: 32.0900, longitude: 34.7700 } // צפון ת"א
  },
  { 
    id: 3, 
    name: 'דנה ישראלי', 
    age: 28, 
    price: 65, 
    distance: 3.5, 
    rating: 4.9, 
    reviews: 120, 
    isAvailable: true, 
    isSuperSitter: true,
    image: 'https://randomuser.me/api/portraits/women/90.jpg', 
    bio: 'גננת מוסמכת ומומלצת בחום 🌟',
    coordinate: { latitude: 32.0700, longitude: 34.7900 } // דרום ת"א
  },
  { 
    id: 4, 
    name: 'רוני אברהם', 
    age: 20, 
    price: 45, 
    distance: 4.2, 
    rating: 4.5, 
    reviews: 8, 
    isAvailable: false, 
    isSuperSitter: false,
    image: 'https://randomuser.me/api/portraits/women/32.jpg', 
    bio: 'תיכוניסטית אחראית ואנרגטית ⚽',
    coordinate: { latitude: 32.0600, longitude: 34.7700 } // יפו
  },
];

const BabySitterScreen = ({ navigation }) => {
  const [address, setAddress] = useState('מאתר מיקום...');
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  
  // States למצבים החדשים
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended', 'rating', 'price', 'distance'

  // לוגיקה למיון בזמן אמת
  const sortedSitters = useMemo(() => {
    let sorted = [...initialSitters];
    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'price':
        return sorted.sort((a, b) => a.price - b.price);
      case 'distance':
        return sorted.sort((a, b) => a.distance - b.distance);
      default:
        return sorted; // ברירת מחדל (מומלץ)
    }
  }, [sortBy]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('תל אביב');
          setIsLoadingLocation(false);
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          setAddress(`${addr.city}, ${addr.street}`);
        }
      } catch (error) {
        setAddress('לא ניתן לאתר מיקום');
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const formatDate = (date) => date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  
  const handlePlayVideo = () => {
    Alert.alert('וידאו היכרות', 'כאן יתנגן סרטון קצר של הבייביסיטר מציגה את עצמה 🎥');
  };

  return (
    <View style={styles.container}>
      
      {/* --- Header --- */}
      <View style={styles.header}>
        <View>
            <Text style={styles.welcomeText}>היי, הורה 👋</Text>
            <Text style={styles.subTitle}>בוא נמצא את האחת המושלמת</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
             <Image source={{uri: 'https://randomuser.me/api/portraits/men/32.jpg'}} style={styles.profileImg} />
        </TouchableOpacity>
      </View>

      {/* --- Search Bar --- */}
      <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.searchRow}>
              <View style={styles.iconCircle}>
                  <Ionicons name="location" size={18} color="#4f46e5" />
              </View>
              <View style={{flex: 1, alignItems: 'flex-end'}}>
                  <Text style={styles.label}>איפה?</Text>
                  {isLoadingLocation ? <ActivityIndicator size="small" color="#999" /> : <Text style={styles.valueText} numberOfLines={1}>{address}</Text>}
              </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.searchRow} onPress={() => setShowCalendar(true)}>
              <View style={styles.iconCircle}>
                  <Ionicons name="calendar" size={18} color="#4f46e5" />
              </View>
              <View style={{flex: 1, alignItems: 'flex-end'}}>
                  <Text style={styles.label}>מתי?</Text>
                  <Text style={styles.valueText}>{formatDate(selectedDate)}</Text>
              </View>
          </TouchableOpacity>
      </View>

      {/* --- מצב תצוגה: רשימה או מפה --- */}
      {viewMode === 'list' ? (
        <View style={styles.contentContainer}>
            {/* פילטרים פעילים */}
            <View style={styles.filterRow}>
                <Text style={styles.resultsCount}>{sortedSitters.length} תוצאות</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', paddingLeft: 20}}>
                    <TouchableOpacity 
                        style={[styles.filterChip, sortBy === 'rating' && styles.activeChip]} 
                        onPress={() => setSortBy('rating')}
                    >
                        <Text style={[styles.filterText, sortBy === 'rating' && styles.activeFilterText]}>⭐ דירוג</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, sortBy === 'distance' && styles.activeChip]}
                        onPress={() => setSortBy('distance')}
                    >
                        <Text style={[styles.filterText, sortBy === 'distance' && styles.activeFilterText]}>📍 קרוב</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, sortBy === 'price' && styles.activeChip]}
                        onPress={() => setSortBy('price')}
                    >
                        <Text style={[styles.filterText, sortBy === 'price' && styles.activeFilterText]}>💰 מחיר</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100, paddingHorizontal: 20}}>
                {sortedSitters.map((sitter) => (
                <TouchableOpacity 
                    key={sitter.id} 
                    activeOpacity={0.9} 
                    onPress={() => navigation.navigate('SitterProfile', { sitterData: sitter })}
                >
                    <View style={styles.card}>
                        {/* תמונה עגולה עם כפתור וידאו */}
                        <View style={styles.imageContainer}>
                            <Image source={{uri: sitter.image}} style={styles.cardImage} />
                            <TouchableOpacity style={styles.playButton} onPress={handlePlayVideo}>
                                <Ionicons name="play" size={10} color="#fff" style={{marginLeft: 2}} />
                            </TouchableOpacity>
                            {sitter.isSuperSitter && (
                                <View style={styles.superSitterBadge}>
                                    <Ionicons name="trophy" size={10} color="#fff" />
                                    <Text style={styles.superSitterText}>SUPER</Text>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.cardContent}>
                            <View style={styles.cardTop}>
                                <Text style={styles.sitterName}>{sitter.name}, {sitter.age}</Text>
                                <View style={styles.ratingBox}>
                                    <Ionicons name="star" size={12} color="#FFC107" />
                                    <Text style={styles.ratingText}>{sitter.rating}</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.bioText} numberOfLines={1}>{sitter.bio}</Text>
                            
                            <View style={styles.cardBottom}>
                                <Text style={styles.priceText}>₪{sitter.price}<Text style={styles.perHour}> / שעה</Text></Text>
                                <View style={styles.distanceBadge}>
                                    <Ionicons name="location-sharp" size={12} color="#94a3b8" />
                                    <Text style={styles.distanceText}>{sitter.distance} ק"מ</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      ) : (
        // --- תצוגת מפה (Map View) ---
        <View style={styles.mapContainer}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: 32.0853,
                    longitude: 34.7818,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {sortedSitters.map(sitter => (
                    <Marker
                        key={sitter.id}
                        coordinate={sitter.coordinate}
                        title={sitter.name}
                        description={`${sitter.price} ₪ לשעה`}
                    >
                        <View style={styles.markerContainer}>
                            <Image source={{uri: sitter.image}} style={styles.markerImage} />
                            {sitter.isSuperSitter && <View style={styles.markerBadge} />}
                        </View>
                    </Marker>
                ))}
                {userLocation && (
                    <Marker coordinate={userLocation}>
                        <View style={styles.userMarkerOuter}>
                            <View style={styles.userMarkerInner} />
                        </View>
                    </Marker>
                )}
            </MapView>
        </View>
      )}

      {/* --- כפתור צף למעבר בין מפה לרשימה (כמו Airbnb/Wolt) --- */}
      <View style={styles.floatingBtnContainer}>
        <TouchableOpacity 
            style={styles.mapToggleBtn} 
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
        >
            <Text style={styles.mapToggleText}>{viewMode === 'list' ? 'מפה' : 'רשימה'}</Text>
            <Ionicons name={viewMode === 'list' ? "map" : "list"} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* --- Modal לוח שנה --- */}
      <Modal visible={showCalendar} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>בחירת תאריך</Text>
                      <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeBtn}>
                          <Ionicons name="close" size={24} color="#333" />
                      </TouchableOpacity>
                  </View>
                  <View style={styles.calendarPlaceholder}>
                      <Text style={{textAlign: 'center', color: '#666', fontSize: 16}}>
                          כאן יהיה לוח שנה מלא לבחירת כל תאריך עתידי 📅
                      </Text>
                  </View>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowCalendar(false)}>
                      <Text style={styles.confirmText}>אישור</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: 60 },
  
  // Header
  header: { 
      flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', 
      paddingHorizontal: 24, marginBottom: 20 
  },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', textAlign: 'right' },
  subTitle: { fontSize: 14, color: '#666', marginTop: 2, textAlign: 'right' },
  profileBtn: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderRadius: 20 },
  profileImg: { width: 40, height: 40, borderRadius: 20 },

  // Search Bar
  searchBarContainer: {
      backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 20,
      padding: 5, flexDirection: 'row-reverse', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4,
      marginBottom: 20
  },
  searchRow: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', padding: 10, gap: 10 },
  iconCircle: { width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, color: '#999', fontWeight: '500' },
  valueText: { fontSize: 14, fontWeight: '700', color: '#333' },
  divider: { width: 1, height: '60%', backgroundColor: '#EEE' },

  // Filters & List
  contentContainer: { flex: 1 },
  filterRow: { 
      flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', 
      marginBottom: 15, paddingRight: 24
  },
  resultsCount: { fontSize: 14, fontWeight: '700', color: '#333', marginLeft: 10 },
  filterChip: { 
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, 
      backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', marginLeft: 8
  },
  activeChip: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeFilterText: { color: '#fff' },

  // Card Design (WOW)
  card: {
      flexDirection: 'row-reverse', marginBottom: 16, alignItems: 'center',
      backgroundColor: '#fff', padding: 12, borderRadius: 20,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
      borderWidth: 1, borderColor: '#f8f8f8'
  },
  imageContainer: { position: 'relative' },
  cardImage: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#eee' }, // עיגול מושלם
  playButton: {
      position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff'
  },
  superSitterBadge: {
      position: 'absolute', top: -5, left: -5, backgroundColor: '#FFC107', 
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2
  },
  superSitterText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  cardContent: { flex: 1, height: 75, marginRight: 15, justifyContent: 'space-between', paddingVertical: 2 },
  cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sitterName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#333' },
  bioText: { fontSize: 13, color: '#888', textAlign: 'right' },
  cardBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: 16, fontWeight: '800', color: '#4f46e5' },
  perHour: { fontSize: 12, fontWeight: '400', color: '#999' },
  distanceBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  distanceText: { fontSize: 12, color: '#64748b' },

  // Map & Floating Button
  mapContainer: { flex: 1, borderRadius: 30, overflow: 'hidden', marginHorizontal: 20, marginBottom: 80 },
  map: { width: '100%', height: '100%' },
  floatingBtnContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center', zIndex: 100 },
  mapToggleBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', 
      paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, gap: 8,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10
  },
  mapToggleText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Map Markers
  markerContainer: { alignItems: 'center' },
  markerImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  markerBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFC107', borderWidth: 1, borderColor: '#fff' },
  userMarkerOuter: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: 400 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  calendarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16 },
  confirmBtn: { backgroundColor: '#1A1A1A', marginTop: 20, padding: 16, borderRadius: 16, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default BabySitterScreen;