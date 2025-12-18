import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Image } from 'react-native';
import { Utensils, Moon, Layers, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { getRecentHistory, deleteEvent } from '../services/firebaseService';
import { useTheme } from '../context/ThemeContext';

interface TimelineEvent {
  id: string;
  type: 'food' | 'sleep' | 'diaper';
  timestamp: Date;
  amount?: string;
  note?: string;
  subType?: string;
  reporterName?: string;
  reporterPhotoUrl?: string;
  [key: string]: any;
}

interface DailyTimelineProps {
  refreshTrigger?: number;
  childId?: string; // Accept childId as prop
}

const TYPE_CONFIG = {
  food: {
    icon: Utensils,
    color: '#F59E0B',
    label: 'אוכל',
  },
  sleep: {
    icon: Moon,
    color: '#8B5CF6',
    label: 'שינה',
  },
  diaper: {
    icon: Layers,
    color: '#10B981',
    label: 'חיתול',
  },
} as const;

const INITIAL_VISIBLE_COUNT = 4;

const DailyTimeline = memo<DailyTimelineProps>(({ refreshTrigger = 0, childId = '' }) => {
  const { theme, isDarkMode } = useTheme();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (childId) {
      loadTimeline();
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [childId, refreshTrigger]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [events]);

  const loadTimeline = async () => {
    if (!childId) return;
    try {
      const history = await getRecentHistory(childId);
      // Map Firebase data directly
      const mapped: TimelineEvent[] = history.map((item: any) => ({
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
      }));
      setEvents(mapped);
    } catch (error) {
      console.error('Timeline load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert(
      'מחיקת תיעוד',
      'האם אתה בטוח שברצונך למחוק תיעוד זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              // Remove from local state
              setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
            } catch (error) {
              Alert.alert('שגיאה', 'לא ניתן למחוק את התיעוד');
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'עכשיו';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}ד׳`;
    const hours = Math.floor(minutes / 60);
    return `${hours}ש׳`;
  };

  // Format event details
  const getEventDetails = (event: TimelineEvent) => {
    if (event.type === 'food') {
      if (event.subType === 'bottle') {
        return event.amount || 'בקבוק';
      } else if (event.subType === 'breast') {
        return 'הנקה';
      } else if (event.subType === 'pumping') {
        return event.amount ? `שאיבה ${event.amount}` : 'שאיבה';
      } else if (event.subType === 'solids') {
        return event.note || 'מזון מוצק';
      }
      return event.amount || event.note || 'אוכל';
    } else if (event.type === 'sleep') {
      // Extract duration from note or duration field
      if (event.duration) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        if (h > 0) {
          return `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        }
        return `${m} דקות`;
      }
      // Try to extract from note
      if (event.note && event.note.includes('משך שינה:')) {
        const match = event.note.match(/משך שינה: (\d+:\d+)/);
        if (match) return match[1];
      }
      return 'שינה';
    } else if (event.type === 'diaper') {
      if (event.subType === 'pee') return 'שתן';
      if (event.subType === 'poop') return 'יציאה';
      if (event.subType === 'both') return 'שניהם';
      return 'החלפת חיתול';
    }
    return '';
  };

  const getEventSubtext = (event: TimelineEvent) => {
    if (event.type === 'food') {
      if (event.subType === 'bottle') return 'בקבוק';
      if (event.subType === 'breast') return event.note ? event.note.substring(0, 30) : '';
      if (event.subType === 'solids') return 'מזון מוצקים';
      if (event.subType === 'pumping') return event.note || 'שאיבה';
    } else if (event.type === 'sleep') {
      // Extract user note after pipe separator
      if (event.note && event.note.includes(' | ')) {
        const parts = event.note.split(' | ');
        return parts[1] ? parts[1].substring(0, 35) : 'שינה';
      }
      return 'שינה';
    }
    return '';
  };

  const stats = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visibleEvents = isExpanded ? events : events.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = events.length > INITIAL_VISIBLE_COUNT;

  if (loading) return null;

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <View style={styles.accentLine} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>סדר היום</Text>
          </View>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>📝</Text>
          </View>
          <Text style={[styles.emptyText, { color: theme.textPrimary }]}>אין תיעודים להיום</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>השתמש בכפתורים למעלה כדי להתחיל</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View style={styles.accentLine} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>סדר היום</Text>
        </View>

        {/* Stats Pills */}
        <View style={styles.statsContainer}>
          {Object.entries(stats).map(([type, count]) => {
            const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            const Icon = config.icon;
            return (
              <View key={type} style={[styles.statPill, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <Text style={[styles.statCount, { color: theme.textPrimary }]}>{count}</Text>
                <Icon size={11} color="#6B7280" strokeWidth={2.5} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {visibleEvents.map((event, index) => {
          const config = TYPE_CONFIG[event.type];
          const Icon = config.icon;
          const isLast = index === visibleEvents.length - 1;
          const details = getEventDetails(event);
          const subtext = getEventSubtext(event);

          return (
            <View key={event.id} style={styles.eventRow}>
              {/* Left side: Time + Dot */}
              <View style={styles.leftSection}>
                <Text style={styles.time}>
                  {event.timestamp.toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </Text>
                <Text style={styles.timeAgo}>{getTimeAgo(event.timestamp)}</Text>
              </View>

              {/* Timeline icon + line */}
              <View style={styles.timelineTrack}>
                <View style={[styles.timelineIcon, { backgroundColor: config.color + '20' }]}>
                  <Icon size={14} color={config.color} strokeWidth={2} />
                </View>
                {!isLast && <View style={styles.connector} />}
              </View>

              {/* Right side: Content */}
              <View style={[styles.eventCard, { backgroundColor: theme.card }]}>
                <View style={styles.cardContent}>
                  <View style={styles.eventHeader}>
                    <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{details}</Text>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(event.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={14} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  {subtext && (
                    <Text style={[styles.eventSubtext, { color: theme.textSecondary }]}>{subtext}</Text>
                  )}
                </View>

                {/* Reporter Badge - Small avatar showing who reported */}
                {event.reporterName && (
                  <View style={styles.reporterBadge}>
                    {event.reporterPhotoUrl ? (
                      <Image source={{ uri: event.reporterPhotoUrl }} style={styles.reporterAvatar} />
                    ) : (
                      <View style={[styles.reporterAvatarPlaceholder, { backgroundColor: config.color + '30' }]}>
                        <Text style={[styles.reporterInitial, { color: config.color }]}>
                          {event.reporterName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Expand */}
      {hasMore && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.6}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} color="#9CA3AF" strokeWidth={2.5} />
              <Text style={styles.expandText}>הצג פחות</Text>
            </>
          ) : (
            <>
              <Text style={styles.expandText}>הצג {events.length - INITIAL_VISIBLE_COUNT} נוספים</Text>
              <ChevronDown size={14} color="#9CA3AF" strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

DailyTimeline.displayName = 'DailyTimeline';

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  accentLine: {
    width: 3,
    height: 18,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F9FAFB',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },

  // Timeline
  timeline: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row-reverse',
    marginBottom: 16,
  },

  // Left: Time
  leftSection: {
    width: 56,
    paddingTop: 2,
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  timeAgo: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  // Center: Timeline
  timelineTrack: {
    width: 36,
    alignItems: 'center',
    position: 'relative',
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
    marginTop: 6,
  },
  connector: {
    position: 'absolute',
    top: 30,
    width: 1.5,
    height: '100%',
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },

  // Right: Content
  eventCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  cardContent: {
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 20,
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 2,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FAFAFA',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  emptyHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Expand
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.1,
  },

  // Reporter Badge
  reporterBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    zIndex: 10,
  },
  reporterAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
  },
  reporterAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  reporterInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default DailyTimeline;