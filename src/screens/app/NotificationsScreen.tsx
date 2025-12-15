import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { useNotifications } from '../../context/notifications-context';
import { format, parseISO } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function NotificationsScreen() {
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const { notifications: staffNotifications, markAsRead } = useNotifications();

  // Mark all unread notifications as read when screen is opened
  useEffect(() => {
    staffNotifications.forEach(notification => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }
    });
  }, []);

  // Auto-generated notifications from upcoming vaccines
  const autoNotifications = familyMembers
    .flatMap((member) =>
      member.vaccineHistory
        .filter((v) => v.status === 'Upcoming')
        .map((v) => ({
          id: `${member.id}-${v.name}`,
          memberName: member.name,
          message: `${v.name} (Dose ${v.dose}) is scheduled`,
          date: v.date,
          type: 'Upcoming' as const,
          isRead: true, // Auto notifications are always "read"
        }))
    );

  // Combine staff notifications and auto notifications, sort by date
  const allNotifications = [...staffNotifications, ...autoNotifications]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
        {staffNotifications.filter(n => !n.isRead).length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{staffNotifications.filter(n => !n.isRead).length}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {allNotifications.map((notification) => (
          <View 
            key={notification.id} 
            style={[
              styles.notificationCard, 
              { backgroundColor: theme.colors.card },
              !notification.isRead && styles.unreadCard
            ]}
          >
            <View style={[
              styles.iconContainer,
              notification.type === 'Reminder' && { backgroundColor: '#fef3c7' }
            ]}>
              <Ionicons 
                name={notification.type === 'Reminder' ? 'mail' : 'notifications'} 
                size={24} 
                color={notification.type === 'Reminder' ? '#f59e0b' : '#6366f1'} 
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.headerRow}>
                <Text style={[styles.memberName, { color: theme.colors.text }]}>{notification.memberName}</Text>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{notification.message}</Text>
              <Text style={[styles.date, { color: theme.colors.textTertiary }]}>
                {format(parseISO(notification.date), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        ))}

        {allNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No notifications</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  iconContainer: {
    marginRight: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
