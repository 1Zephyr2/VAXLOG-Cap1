import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function CalendarScreen() {
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get all vaccination dates
  const vaccinationDates = useMemo(() => {
    const dates: { [key: string]: any[] } = {};
    
    familyMembers.forEach((member) => {
      if (selectedMemberId && member.id !== selectedMemberId) return;
      
      member.vaccineHistory.forEach((vaccine) => {
        const dateKey = format(parseISO(vaccine.date), 'yyyy-MM-dd');
        if (!dates[dateKey]) {
          dates[dateKey] = [];
        }
        dates[dateKey].push({
          memberName: member.name,
          memberId: member.id,
          vaccineName: vaccine.name,
          dose: vaccine.dose,
          status: vaccine.status,
        });
      });
    });
    
    return dates;
  }, [familyMembers, selectedMemberId]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Get starting day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = startOfMonth(currentDate).getDay();

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const renderDayDots = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const appointments = vaccinationDates[dateKey] || [];
    
    if (appointments.length === 0) return null;

    const hasCompleted = appointments.some(a => a.status === 'Completed');
    const hasUpcoming = appointments.some(a => a.status === 'Upcoming');

    return (
      <View style={styles.dotsContainer}>
        {hasCompleted && <View style={[styles.dot, styles.dotCompleted]} />}
        {hasUpcoming && <View style={[styles.dot, styles.dotUpcoming]} />}
      </View>
    );
  };

  const handleDatePress = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const hasAppointments = vaccinationDates[dateKey]?.length > 0;
    
    if (!hasAppointments) return;
    
    // Toggle: if clicking same date, close it; otherwise open new date
    setSelectedDate(selectedDate === dateKey ? null : dateKey);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Calendar</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Family Member Filter */}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                !selectedMemberId && { borderColor: theme.colors.primary, backgroundColor: theme.colors.iconBackground },
              ]}
              onPress={() => setSelectedMemberId(null)}
            >
              <Text style={[
                styles.filterText,
                { color: theme.colors.textSecondary },
                !selectedMemberId && { color: theme.colors.primary, fontWeight: '700' },
              ]}>
                All Members
              </Text>
            </TouchableOpacity>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  selectedMemberId === member.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.iconBackground },
                ]}
                onPress={() => setSelectedMemberId(member.id)}
              >
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.filterAvatar} />
                ) : (
                  <View style={[styles.filterAvatar, styles.filterAvatarPlaceholder]}>
                    <Text style={styles.filterAvatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={[
                  styles.filterText,
                  { color: theme.colors.textSecondary },
                  selectedMemberId === member.id && { color: theme.colors.primary, fontWeight: '700' },
                ]}>
                  {member.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Month Navigation */}
        <View style={[styles.monthNavigation, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>{format(currentDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card }]}>
          {/* Day Headers */}
          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { color: theme.colors.textSecondary }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.dayCell} />
            ))}

            {/* Actual days */}
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const hasAppointments = vaccinationDates[dateKey]?.length > 0;
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate === dateKey;

              return (
                <TouchableOpacity
                  key={day.toString()}
                  style={styles.dayCell}
                  onPress={() => handleDatePress(day)}
                  disabled={!hasAppointments}
                >
                  <View style={[
                    styles.dayCircle,
                    isToday && { borderColor: theme.colors.primary, borderWidth: 2 },
                    hasAppointments && { backgroundColor: theme.colors.iconBackground },
                    isSelected && { backgroundColor: theme.colors.primary },
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: theme.colors.text },
                      isToday && { color: theme.colors.primary, fontWeight: '700' },
                      hasAppointments && { color: theme.colors.primary },
                      isSelected && { color: 'white', fontWeight: '700' },
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  {renderDayDots(day)}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedDate && vaccinationDates[selectedDate] && (
          <View style={[styles.detailsContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsDate, { color: theme.colors.text }]}>
                {format(parseISO(selectedDate), 'MMMM d, yyyy')}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <Ionicons name="close-circle" size={24} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {vaccinationDates[selectedDate].map((appointment, index) => (
              <View key={index} style={[styles.appointmentCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={styles.appointmentInfo}>
                  <Text style={[styles.appointmentVaccine, { color: theme.colors.text }]}>{appointment.vaccineName}</Text>
                  <Text style={[styles.appointmentMember, { color: theme.colors.textSecondary }]}>
                    {appointment.memberName} - Dose {appointment.dose}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  appointment.status === 'Completed' ? styles.statusCompleted : styles.statusUpcoming
                ]}>
                  <Text style={[
                    styles.statusText,
                    appointment.status === 'Completed' ? styles.statusTextCompleted : styles.statusTextUpcoming
                  ]}>
                    {appointment.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {Object.keys(vaccinationDates).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No vaccination appointments</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>Add family members and their vaccination records to see them here</Text>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
  },
  filterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  filterAvatarPlaceholder: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterTextActive: {
    color: 'white',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCircle: {
    backgroundColor: '#e0e7ff',
  },
  appointmentDay: {
    backgroundColor: '#f0f9ff',
  },
  selectedDay: {
    backgroundColor: '#6366f1',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  appointmentDayText: {
    fontWeight: '600',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotCompleted: {
    backgroundColor: '#15803d',
  },
  dotUpcoming: {
    backgroundColor: '#b45309',
  },
  detailsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 80,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  detailsDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentVaccine: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentMember: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusUpcoming: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#15803d',
  },
  statusTextUpcoming: {
    color: '#b45309',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
});
