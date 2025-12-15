import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme-context';
import { useAppointments } from '../../context/appointments-context';
import { format, addDays, startOfWeek, getDaysInMonth, getDay, startOfMonth, endOfMonth } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function AppointmentsCalendarScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { appointments } = useAppointments();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar days for month view
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = addDays(monthEnd, 7 - getDay(monthEnd));
    
    const days = [];
    let current = startDate;
    
    while (current <= endDate) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get appointments for selected date
  const selectedDateAppointments = appointments.filter(
    apt => apt.date === format(selectedDate, 'yyyy-MM-dd')
  );

  // Get stats
  const stats = {
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    total: appointments.length,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Calendar</Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.scheduled}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Scheduled</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>{stats.cancelled}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Cancelled</Text>
          </View>
        </View>

        {/* Month Calendar */}
        <View style={styles.calendarSection}>
          {/* Month Navigation */}
          <View style={styles.monthNavBar}>
            <TouchableOpacity
              onPress={() => setCurrentMonth(addDays(currentMonth, -30))}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthName, { color: theme.colors.text }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentMonth(addDays(currentMonth, 30))}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.calendarDayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={[styles.calendarDayHeaderText, { color: theme.colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGridHeader}>
            {calendarDays.map((day, index) => {
              const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayAppointments = appointments.filter(apt => apt.date === format(day, 'yyyy-MM-dd'));
              const scheduledCount = dayAppointments.filter(a => a.status === 'scheduled').length;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarGridDay,
                    { backgroundColor: isSelected ? theme.colors.primary : theme.colors.card },
                    !isCurrentMonth && { backgroundColor: theme.colors.background },
                    isToday && !isSelected && { borderWidth: 2, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: isSelected ? theme.colors.primary : 'transparent' }
                  ]}>
                    <Text style={[
                      styles.calendarGridDayNumber,
                      { color: isSelected ? '#fff' : (isCurrentMonth ? theme.colors.text : theme.colors.textTertiary) }
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  {scheduledCount > 0 && (
                    <View style={styles.appointmentCountBadge}>
                      <Text style={[styles.appointmentCount, { color: isSelected ? '#fff' : theme.colors.primary }]}>
                        {scheduledCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Selected Date Appointments */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.dateInfoContainer}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.dateInfoText, { color: theme.colors.text }]}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>

        {selectedDateAppointments.length > 0 ? (
          <>
            <Text style={[styles.appointmentsCountText, { color: theme.colors.text }]}>
              {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''}
            </Text>
            {selectedDateAppointments.map((appointment, index) => (
              <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.appointmentIndex}>
                  <Text style={[styles.indexText, { color: '#fff' }]}>{index + 1}</Text>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={[styles.timeText, { color: theme.colors.primary }]}>{appointment.time}</Text>
                  <Text style={[styles.patientName, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                  <Text style={[styles.vaccineText, { color: theme.colors.textSecondary }]}>
                    <Ionicons name="medical-outline" size={13} /> {appointment.vaccine}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(appointment.status) }]}>
                      {getStatusLabel(appointment.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No appointments on this date
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'cancelled':
      return '#ef4444';
    case 'scheduled':
    default:
      return '#6366f1';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  calendarSection: {
    gap: 12,
  },
  monthNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthNavButton: {
    padding: 8,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendarDayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGridHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  calendarGridDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
  },
  calendarGridDayNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dateInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dateInfoText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentsCountText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  appointmentCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  appointmentDetails: {
    flex: 1,
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  vaccineText: {
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
