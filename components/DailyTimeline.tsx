import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ScrollView, Share } from 'react-native';
import { Utensils, Moon, Layers, ChevronDown, ChevronUp, X, FileText, Pill, AlertCircle, RefreshCw } from 'lucide-react-native';
import { getRecentHistory, deleteEvent } from '../services/firebaseService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../hooks/useFamily';
import Animated, { FadeInRight, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { auth } from '../services/firebaseConfig';
import { TimelineSkeleton } from './Home/SkeletonLoader';
import SwipeableRow from './SwipeableRow';
import { useToast } from '../context/ToastContext';

interface TimelineEvent {
  id: string;
  type: 'food' | 'sleep' | 'diaper' | 'supplements' | 'custom';
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


const INITIAL_VISIBLE_COUNT = 4;

const DailyTimeline = memo<DailyTimelineProps>(({ refreshTrigger = 0, childId = '' }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { family } = useFamily();
  const { showSuccess, showError } = useToast();
  
  // Get translated TYPE_CONFIG
  const TYPE_CONFIG = {
    food: {
      icon: Utensils,
      color: '#F59E0B',
      label: t('actions.food'),
    },
    sleep: {
      icon: Moon,
      color: '#8B5CF6',
      label: t('actions.sleep'),
    },
    diaper: {
      icon: Layers,
      color: '#10B981',
      label: t('actions.diaper'),
    },
    supplements: {
      icon: Pill,
      color: '#EC4899',
      label: t('actions.supplements'),
    },
    custom: {
      icon: FileText,
      color: '#8B5CF6',
      label: t('actions.custom'),
    },
  };
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineHeight, setLineHeight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (childId) {
      loadTimeline();
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [childId, refreshTrigger, family]);

  // Check if event happened in last hour for pulsing effect
  const isRecentEvent = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    return diff < 3600000; // 1 hour in milliseconds
  };

  const loadTimeline = async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      // Check if user is a guest and get historyAccessDays
      const userId = auth.currentUser?.uid;
      const historyAccessDays = userId && family?.members[userId]?.historyAccessDays;

      const history = await getRecentHistory(childId, undefined, historyAccessDays);
      // Map Firebase data directly
      const mapped: TimelineEvent[] = history.map((item: any) => ({
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
      }));
      setEvents(mapped);
      setError(null);
    } catch (error: any) {
      if (__DEV__) console.log('Timeline load error:', error);
      const errorMessage = error?.message || t('timeline.loading');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await deleteEvent(eventId);
      setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
      showSuccess('נמחק בהצלחה', 3000, {
        label: 'ביטול',
        onPress: async () => {
          // TODO: Re-add event (would need to store full event data)
          showSuccess('בוטל');
        },
      });
    } catch (error) {
      showError('שגיאה במחיקה');
    }
  };

  const handleShare = async (event: TimelineEvent) => {
    const eventText = `${getEventDetails(event)}\n${getTimeAgo(event.timestamp)}`;
    try {
      await Share.share({ message: eventText });
    } catch (error) {
      showError('לא ניתן לשתף');
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    
    if (seconds < 60) return t('time.now');
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `לפני ${minutes} דקות`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
    }
    
    const days = Math.floor(hours / 24);
    if (days === 1) return t('timeline.yesterday');
    if (days < 7) return t('time.daysAgo', { count: days });
    
    // For older events, show date
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  // Format event details
  const getEventDetails = (event: TimelineEvent) => {
    if (event.type === 'food') {
      if (event.subType === 'bottle') {
        return event.amount || t('timeline.bottle');
      } else if (event.subType === 'breast') {
        return t('timeline.breast');
      } else if (event.subType === 'pumping') {
        return event.amount ? `${t('timeline.pumping')} ${event.amount}` : t('timeline.pumping');
      } else if (event.subType === 'solids') {
        return event.note || t('tracking.solidsFood');
      }
      return event.amount || event.note || t('timeline.food');
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
      return t('timeline.sleep');
    } else if (event.type === 'diaper') {
      if (event.subType === 'pee') return t('diaper.wet');
      if (event.subType === 'poop') return t('diaper.dirty');
      if (event.subType === 'both') return t('tracking.both');
      return 'החלפת חיתול';
    } else if (event.type === 'supplements') {
      if (event.subType === 'vitaminD') return 'ויטמין D';
      if (event.subType === 'iron') return t('timeline.iron');
      if (event.subType === 'probiotic') return t('timeline.probiotic');
      if (event.subType === 'multivitamin') return 'Multivitamin';
      return event.note || t('timeline.supplement');
    } else if (event.type === 'custom') {
      return event.note || 'פעולה מותאמת';
    }
    return '';
  };

  const getEventSubtext = (event: TimelineEvent) => {
    if (event.type === 'food') {
      if (event.subType === 'bottle') return t('timeline.bottle');
      if (event.subType === 'breast') return event.note ? event.note.substring(0, 30) : '';
      if (event.subType === 'solids') return t('tracking.solidsFood');
      if (event.subType === 'pumping') return event.note || t('timeline.pumping');
    } else if (event.type === 'sleep') {
      // Extract user note after pipe separator
      // Extract user note after pipe separator
      if (event.note) {
        if (event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? parts[1].substring(0, 35) : 'שינה';
        }
        // If note exists but no pipe (and it's not just "שינה חדשה" or duration-like), show it
        // Check if note is just a duration string to avoid duplication if title shows duration
        const isDuration = event.note.includes('משך שינה') || event.note.match(/^\d{2}:\d{2} →/);
        return isDuration ? 'שינה' : event.note;
      }
      return t('timeline.sleep');
    } else if (event.type === 'diaper') {
      return event.note || '';
    } else if (event.type === 'custom') {
      return event.subType || '';
    }
    return event.note || '';
  };

  const stats = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visibleEvents = isExpanded ? events : events.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = events.length > INITIAL_VISIBLE_COUNT;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
        </View>
        <TimelineSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
        </View>
        <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
          <AlertCircle size={24} color="#EF4444" />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadTimeline}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
          <View style={styles.emptyIcon}>
            <FileText size={32} color="#9CA3AF" strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyText, { color: theme.textPrimary }]}>{t('timeline.noRecordsToday')}</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            השתמש בפעולות המהירות למעלה{'\n'}כדי להתחיל לתעד פעילויות
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>סדר היום</Text>
        </View>

        {/* Stats Pills */}
        <View style={styles.statsContainer}>
          {Object.entries(stats).map(([type, count]) => {
            const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            if (!config) return null; // Skip if type not in config
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

      {/* Timeline with Staggered Entry and Growing Line */}
      <View style={styles.timeline}>
        {visibleEvents.map((event, index) => {
          const config = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food;
          const Icon = config.icon;
          const isLast = index === visibleEvents.length - 1;
          const details = getEventDetails(event);
          const subtext = getEventSubtext(event);
          const isRecent = isRecentEvent(event.timestamp);

          return (
            <Animated.View
              key={event.id}
              entering={FadeInRight.duration(300).delay(index * 80).springify()}
            >
              <SwipeableRow
                onDelete={() => handleDelete(event.id)}
                onShare={() => handleShare(event)}
              >
                <View style={styles.eventRow} collapsable={false}>
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
                    {/* Line connector */}
                    {!isLast && <View style={styles.connector} />}
                  </View>

                  {/* Right side: Content */}
                  <View style={styles.eventCardContainer}>
                    <View style={styles.eventCard}>
                      <View style={styles.cardContent}>
                        <View style={styles.eventHeader}>
                          <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{details}</Text>
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
                </View>
              </SwipeableRow>
            </Animated.View>
          );
        })}
      </View>

      {/* Expand */}
      {hasMore && (
        <Animated.View entering={FadeIn.duration(300).delay(visibleEvents.length * 80)}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => {
              setIsExpanded(!isExpanded);
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            activeOpacity={0.6}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} color="#9CA3AF" strokeWidth={2.5} />
                <Text style={styles.expandText}>{t('timeline.showLess')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.expandText}>{t('timeline.showMore', { count: events.length - INITIAL_VISIBLE_COUNT })}</Text>
                <ChevronDown size={14} color="#9CA3AF" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

DailyTimeline.displayName = 'DailyTimeline';

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
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
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 100,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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

  // Right: Content - Pill Style
  eventCardContainer: {
    flex: 1,
    borderRadius: 16,
    // Clean shadow on white card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 64,
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 6,
  },
  cardContent: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  eventHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
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
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
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