import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Moon, Utensils, Layers, Circle } from 'lucide-react-native';

// סוגי נתונים (תואם למה שיש לך)
const MOCK_EVENTS = [
  { id: '1', type: 'sleep', time: '14:00', label: 'שינה', detail: 'שנת צהריים' },
  { id: '2', type: 'food', time: '12:30', label: 'אוכל', detail: '120 מ״ל' },
  { id: '3', type: 'diaper', time: '11:00', label: 'חיתול', detail: 'החלפה' },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'food': return <Utensils size={16} color="#fff" />;
    case 'sleep': return <Moon size={16} color="#fff" />;
    case 'diaper': return <Layers size={16} color="#fff" />;
    default: return <Circle size={16} color="#fff" />;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'food': return '#F59E0B'; // כתום
    case 'sleep': return '#6366F1'; // סגול
    case 'diaper': return '#10B981'; // ירוק
    default: return '#9CA3AF';
  }
};

export default function DailyTimeline() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>סדר היום של עלמא</Text>
      
      <View style={styles.timelineContainer}>
        {/* קו מחבר */}
        <View style={styles.verticalLine} />

        {MOCK_EVENTS.map((event, index) => (
          <View key={event.id} style={styles.eventRow}>
            
            {/* זמן */}
            <Text style={styles.timeText}>{event.time}</Text>

            {/* אייקון על הציר */}
            <View style={[styles.iconBubble, { backgroundColor: getColor(event.type) }]}>
              {getIcon(event.type)}
            </View>

            {/* כרטיס מידע */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{event.label}</Text>
              <Text style={styles.cardDetail}>{event.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
    textAlign: 'right',
  },
  timelineContainer: {
    position: 'relative',
    paddingRight: 20, // מקום לזמן בצד ימין
  },
  verticalLine: {
    position: 'absolute',
    right: 58, // מיקום הקו
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  eventRow: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    width: 45,
    textAlign: 'left',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9FAFB', // משתלב עם הרקע
    zIndex: 1,
  },
  card: {
    flex: 1,
    marginRight: 15,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
    fontSize: 14,
    textAlign: 'right',
  },
  cardDetail: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
});