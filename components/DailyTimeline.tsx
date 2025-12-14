import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, TouchableOpacity, Platform } from 'react-native';
import { Moon, Utensils, Layers, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
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
  refreshTrigger?: number;
}

// Type configurations
const TYPE_CONFIG = {
  food: { icon: Utensils, colors: ['#F59E0B', '#D97706'], bg: '#FEF3C7', emoji: '🍼' },
  sleep: { icon: Moon, colors: ['#818CF8', '#6366F1'], bg: '#E0E7FF', emoji: '😴' },
  diaper: { icon: Layers, colors: ['#34D399', '#10B981'], bg: '#D1FAE5', emoji: '🧷' },
} as const;

const getLabel = (event: TimelineEvent): string => {
  switch (event.type) {
    case 'food':
      if (event.subType === 'bottle') return `בקבוק ${event.amount || ''}`.trim();
      if (event.subType === 'breast') return 'הנקה';
      if (event.subType === 'pumping') return 'שאיבה';
      if (event.subType === 'solids') return 'מזון מוצק';
      return 'אוכל';
    case 'sleep':
      return event.note ? `שינה` : 'שינה';
    case 'diaper':
      if (event.subType === 'pee') return 'פיפי 💧';
      if (event.subType === 'poop') return 'קקי 💩';
      if (event.subType === 'both') return 'גם וגם';
      return 'חיתול';
    default: return 'אירוע';
  }
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatRelativeTime = (date: Date): string => {
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דק׳`;
  const diffHours = Math.floor(diffMins / 60);
  return `לפני ${diffHours} שעות`;
};

export default function DailyTimeline({ refreshTrigger }: DailyTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('הבייבי');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isExpanded, setIsExpanded] = useState(false);

  const user = auth.currentUser;

  const fetchEvents = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      const profile = await getChildProfile(user.uid);
      if (profile) {
        setChildName(profile.name || 'הבייבי');
        const childId = profile.childId || profile.id;
        if (childId) {
          const history = await getRecentHistory(childId);
          // Filter today's events
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayEvents = (history || [])
            .filter((e: any) => new Date(e.timestamp).getTime() >= today.getTime())
            .slice(0, 20);
          setEvents(todayEvents);
        }
      }
    } catch (error) {
      console.error('DailyTimeline error:', error);
    } finally {
      setLoading(false);
      Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [user, fadeAnim]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));
  useEffect(() => { if (refreshTrigger) fetchEvents(); }, [refreshTrigger, fetchEvents]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const counts = { food: 0, sleep: 0, diaper: 0 };
    events.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
    return counts;
  }, [events]);

  const toggleExpand = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  // Show only 3 events when collapsed
  const visibleEvents = isExpanded ? events : events.slice(0, 3);
  const hasMore = events.length > 3;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📋 סדר היום</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366F1" size="small" />
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סדר היום</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>עוד אין תיעודים להיום 📝</Text>
          <Text style={styles.emptySubtext}>התחל לתעד עם הכפתורים למעלה</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with title */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>סדר היום</Text>
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>היום</Text>
        </View>
      </View>

      {/* Summary Stats Row */}
      <View style={styles.summaryRow}>
        {Object.entries(stats).map(([type, count]) => {
          if (count === 0) return null;
          const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
          const Icon = config.icon;
          return (
            <View key={type} style={[styles.summaryChip, { backgroundColor: config.bg }]}>
              <LinearGradient colors={config.colors} style={styles.summaryIcon}>
                <Icon size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.summaryCount, { color: config.colors[1] }]}>×{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Events List */}
      <Animated.View style={{ opacity: fadeAnim }}>
        {visibleEvents.map((event, index) => {
          const config = TYPE_CONFIG[event.type];
          const Icon = config.icon;

          return (
            <View key={event.id} style={[styles.eventCard, index === 0 && styles.firstCard]}>
              <LinearGradient colors={config.colors} style={styles.iconCircle}>
                <Icon size={16} color="#fff" />
              </LinearGradient>

              <View style={styles.eventContent}>
                <Text style={styles.eventLabel}>{getLabel(event)}</Text>
                {event.note && <Text style={styles.eventNote} numberOfLines={1}>{event.note}</Text>}
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(event.timestamp)}</Text>
                {index === 0 && (
                  <Text style={styles.relativeTime}>{formatRelativeTime(event.timestamp)}</Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Show More/Less Button */}
        {hasMore && (
          <TouchableOpacity style={styles.expandBtn} onPress={toggleExpand} activeOpacity={0.7}>
            {isExpanded ? (
              <>
                <ChevronUp size={18} color="#6366F1" />
                <Text style={styles.expandText}>הסתר</Text>
              </>
            ) : (
              <>
                <ChevronDown size={18} color="#6366F1" />
                <Text style={styles.expandText}>הצג עוד {events.length - 3} אירועים</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
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

  // Summary stats
  summaryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 16,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  summaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Event cards
  eventCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  firstCard: {
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  relativeTime: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 2,
  },

  // Expand button
  expandBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    marginTop: 4,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Empty & Loading
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});