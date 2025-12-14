import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Moon, Utensils, Layers, Clock, AlertCircle, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../services/firebaseConfig';
import { getRecentHistory, getChildProfile } from '../services/firebaseService';

interface TimelineEvent {
  id: string;
  type: 'food' | 'sleep' | 'diaper';
  timestamp: Date;
  subType?: string;
  amount?: string;
  note?: string;
}

interface DailyTimelineProps {
  refreshTrigger?: number; // Will change when new data is saved
}

const getIcon = (type: string) => {
  switch (type) {
    case 'food': return <Utensils size={18} color="#fff" />;
    case 'sleep': return <Moon size={18} color="#fff" />;
    case 'diaper': return <Layers size={18} color="#fff" />;
    default: return <Clock size={18} color="#fff" />;
  }
};

const getGradient = (type: string): [string, string] => {
  switch (type) {
    case 'food': return ['#F59E0B', '#D97706'];
    case 'sleep': return ['#818CF8', '#6366F1'];
    case 'diaper': return ['#34D399', '#10B981'];
    default: return ['#9CA3AF', '#6B7280'];
  }
};

const getLabel = (event: TimelineEvent): string => {
  switch (event.type) {
    case 'food':
      if (event.subType === 'bottle') return `בקבוק ${event.amount || ''}`;
      if (event.subType === 'breast') return 'הנקה';
      return 'אכילה';
    case 'sleep': return 'שינה';
    case 'diaper':
      if (event.subType === 'pee') return 'חיתול - פיפי';
      if (event.subType === 'poop') return 'חיתול - קקי';
      if (event.subType === 'both') return 'חיתול - גם וגם';
      return 'החלפת חיתול';
    default: return 'אירוע';
  }
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;

  return formatTime(date);
};

export default function DailyTimeline({ refreshTrigger }: DailyTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('הבייבי');
  const [fadeAnim] = useState(new Animated.Value(0));

  const user = auth.currentUser;

  const fetchEvents = useCallback(async () => {
    console.log('📅 DailyTimeline: fetchEvents called');
    console.log('📅 DailyTimeline: user =', user?.uid);

    if (!user) {
      console.log('📅 DailyTimeline: No user, stopping');
      setLoading(false);
      return;
    }

    try {
      const profile = await getChildProfile(user.uid);
      console.log('📅 DailyTimeline: profile =', profile);

      if (profile) {
        setChildName(profile.name);
        console.log('📅 DailyTimeline: Fetching events for childId =', profile.childId);

        const history = await getRecentHistory(profile.childId);
        console.log('📅 DailyTimeline: Got history, count =', history.length);
        console.log('📅 DailyTimeline: history =', JSON.stringify(history.slice(0, 3)));

        // Filter today's events only
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('📅 DailyTimeline: Filtering for today =', today.toISOString());

        const todayEvents = history
          .filter((e: any) => {
            const eventDate = new Date(e.timestamp);
            const isToday = eventDate >= today;
            console.log('📅 Event:', e.type, eventDate.toISOString(), 'isToday:', isToday);
            return isToday;
          })
          .slice(0, 10); // Max 10 events

        console.log('📅 DailyTimeline: todayEvents count =', todayEvents.length);
        setEvents(todayEvents as TimelineEvent[]);

        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } else {
        console.log('📅 DailyTimeline: No profile found!');
      }
    } catch (e) {
      console.error('Timeline fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, fadeAnim]);

  // Refresh when screen is focused (includes pull-to-refresh from parent)
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  // Also refresh when refreshTrigger changes (after saving new event)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchEvents();
    }
  }, [refreshTrigger, fetchEvents]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סדר היום של {childName}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366F1" size="small" />
          <Text style={styles.loadingText}>טוען אירועים...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סדר היום של {childName}</Text>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <AlertCircle size={32} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>עוד לא תיעדת היום 📝</Text>
          <Text style={styles.emptySubtitle}>
            השתמש בכפתורי התיעוד המהיר למעלה{'\n'}כדי להתחיל לעקוב אחרי {childName}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>סדר היום של {childName}</Text>
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>היום</Text>
        </View>
      </View>

      <Animated.View style={[styles.timelineContainer, { opacity: fadeAnim }]}>
        {/* Vertical line */}
        <View style={styles.verticalLine} />

        {events.map((event, index) => (
          <View
            key={event.id}
            style={[
              styles.eventRow,
              index === 0 && styles.firstEventRow,
            ]}
          >
            {/* Time */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(event.timestamp)}</Text>
              {index === 0 && (
                <Text style={styles.relativeTime}>
                  {formatRelativeTime(event.timestamp)}
                </Text>
              )}
            </View>

            {/* Icon bubble with gradient */}
            <LinearGradient
              colors={getGradient(event.type)}
              style={styles.iconBubble}
            >
              {getIcon(event.type)}
            </LinearGradient>

            {/* Event card */}
            <View style={[
              styles.card,
              index === 0 && styles.firstCard,
            ]}>
              <Text style={styles.cardTitle}>{getLabel(event)}</Text>
              {event.note && (
                <Text style={styles.cardDetail} numberOfLines={1}>
                  {event.note}
                </Text>
              )}
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
  },
  todayBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Timeline
  timelineContainer: {
    position: 'relative',
    paddingRight: 20,
  },
  verticalLine: {
    position: 'absolute',
    right: 66,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },
  eventRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  firstEventRow: {
    marginBottom: 20,
  },
  timeContainer: {
    width: 55,
    alignItems: 'flex-start',
    marginLeft: 12,
  },
  timeText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  relativeTime: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    flex: 1,
    marginRight: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  firstCard: {
    borderColor: '#E0E7FF',
    backgroundColor: '#FAFBFF',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#1F2937',
    fontSize: 14,
    textAlign: 'right',
  },
  cardDetail: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 3,
  },
});