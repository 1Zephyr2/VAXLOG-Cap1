import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme-context';
import { useAppointments } from '../../context/appointments-context';
import { useStaffPatients } from '../../context/staff-patients-context';
import { format, addDays, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';

type AppointmentStatus = 'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled';

export default function AppointmentsListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { appointments, addAppointment, completeAppointment, cancelAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { staffPatients, updateStaffPatient } = useStaffPatients();
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus>('all');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleHour, setRescheduleHour] = useState('08');
  const [rescheduleMinute, setRescheduleMinute] = useState('00');
  
  // Booking states
  const [appointmentType, setAppointmentType] = useState<'vaccination' | 'checkup'>('vaccination');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [selectedCheckupReason, setSelectedCheckupReason] = useState('');
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

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

  // Group patients by family
  const familyMembers = staffPatients;
  const groupedFamilies = familyMembers.reduce((acc, member) => {
    const familyOwner = member.relationship === 'Me' 
      ? member 
      : familyMembers.find(m => m.relationship === 'Me' && m.name.split(' ')[1] === member.name.split(' ')[1]);
    
    const familyKey = familyOwner?.id || member.id;
    
    if (!acc[familyKey]) {
      acc[familyKey] = {
        owner: familyOwner || member,
        members: [],
      };
    }
    
    acc[familyKey].members.push(member);
    return acc;
  }, {} as Record<string, { owner: any; members: any[] }>);

  // Sort members within each family (owner first)
  Object.values(groupedFamilies).forEach(family => {
    family.members.sort((a, b) => {
      if (a.relationship === 'Me') return -1;
      if (b.relationship === 'Me') return 1;
      return 0;
    });
  });

  // Filter families based on search
  const filteredFamiliesForBooking = Object.values(groupedFamilies).filter(family =>
    family.members.some(member =>
      member.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
      family.owner.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
    )
  );

  // Auto-expand families when searching
  React.useEffect(() => {
    if (patientSearchQuery.trim()) {
      const familyIds = new Set(filteredFamiliesForBooking.map(f => f.owner.id));
      setExpandedFamilies(familyIds);
    }
  }, [patientSearchQuery]);

  const toggleFamilyInModal = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    return matchesStatus;
  });

  // Sort by date and time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const aDate = a.date || '9999-12-31';
    const bDate = b.date || '9999-12-31';
    const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    const aTime = a.time || '00:00';
    const bTime = b.time || '00:00';
    return aTime.localeCompare(bTime);
  });

  // Get status stats
  const getStatusStats = () => {
    return {
      pending: appointments.filter(a => a.status === 'pending').length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      total: appointments.length,
    };
  };

  const stats = getStatusStats();

  const handleBookAppointment = () => {
    setShowBookingModal(true);
    setAppointmentType('vaccination');
    setSelectedDate(new Date());
    setCurrentMonth(new Date());
    setPatientSearchQuery('');
    setExpandedFamilies(new Set());
    setSelectedPatient('');
    setSelectedVaccine('');
    setSelectedCheckupReason('');
    setSelectedHour('08');
    setSelectedMinute('00');
  };

  const handleSaveAppointment = async () => {
    // Validation
    const errors = [];
    
    if (!selectedPatient.trim()) {
      errors.push('Please select a patient');
    }
    
    if (appointmentType === 'vaccination' && !selectedVaccine.trim()) {
      errors.push('Please enter a vaccine name');
    }

    if (appointmentType === 'checkup' && !selectedCheckupReason.trim()) {
      errors.push('Please enter reason for checkup');
    }

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    // Find the patient
    const patient = familyMembers.find(m => m.name === selectedPatient);
    
    if (!patient) {
      Alert.alert('Error', 'Patient not found');
      return;
    }
    
    // Format time in 24-hour format
    const formattedTime = `${selectedHour}:${selectedMinute}`;
    
    // Create new appointment (without id - Firebase will generate it)
    const newAppointment: any = {
      patientId: patient.id,
      patientName: selectedPatient,
      appointmentType: appointmentType,
      time: formattedTime,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'scheduled' as const,
      bookedByStaff: true,
    };

    if (appointmentType === 'vaccination') {
      newAppointment.vaccine = selectedVaccine;
    } else {
      newAppointment.reasonForCheckup = selectedCheckupReason;
    }

    try {
      // Add appointment to Firestore
      await addAppointment(newAppointment);
    
      if (appointmentType === 'vaccination') {
        // Add vaccine to patient's vaccine history as "Upcoming"
        const currentHistory = patient.vaccineHistory || [];
        const updatedVaccineHistory = [
          ...currentHistory,
          {
            name: selectedVaccine,
            dose: 'Dose 1',
            date: format(selectedDate, 'yyyy-MM-dd'),
            status: 'Upcoming' as const,
          }
        ];

        await updateStaffPatient(patient.id, {
          vaccineHistory: updatedVaccineHistory
        });
      }

      const typeText = appointmentType === 'vaccination' ? `${selectedVaccine} vaccination` : `${selectedCheckupReason} checkup`;
      Alert.alert('Success', `Appointment booked for ${selectedPatient}\n${typeText} at ${formattedTime}\n${format(selectedDate, 'MMMM d, yyyy')}`);
      setShowBookingModal(false);
      setSelectedPatient('');
      setSelectedVaccine('');
      setSelectedCheckupReason('');
      setSelectedHour('08');
      setSelectedMinute('00');
      setPatientSearchQuery('');
      setExpandedFamilies(new Set());
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    }
  };

  const handleCompleteAppointment = (appointment: any) => {
    Alert.alert(
      'Complete Appointment',
      `Mark ${appointment.patientName}'s ${appointment.vaccine} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeAppointment(appointment.id);
              Alert.alert('Success', 'Appointment marked as completed');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete appointment');
            }
          }
        },
      ]
    );
  };

  const handleCancelAppointment = (appointment: any) => {
    const appointmentDesc = appointment.appointmentType === 'vaccination'
      ? `${appointment.vaccine} vaccination`
      : `${appointment.reasonForCheckup} checkup`;
    
    Alert.alert(
      'Cancel Appointment',
      `Cancel ${appointment.patientName}'s ${appointmentDesc} at ${appointment.time}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appointment.id);
              Alert.alert('Success', 'Appointment cancelled');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        },
      ]
    );
  };

  const handleScheduleCheckupDate = (appointment: any) => {
    setRescheduleAppointment(appointment);
    setRescheduleDate(new Date());
    setRescheduleHour('08');
    setRescheduleMinute('00');
    setShowRescheduleModal(true);
  };

  const handleRescheduleAppointment = (appointment: any) => {
    setRescheduleAppointment(appointment);
    setRescheduleDate(new Date(appointment.date));
    const [hour, minute] = appointment.time.split(':');
    setRescheduleHour(hour);
    setRescheduleMinute(minute);
    setShowRescheduleModal(true);
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleAppointment) return;

    try {
      const newTime = `${rescheduleHour}:${rescheduleMinute}`;
      const newDate = format(rescheduleDate, 'yyyy-MM-dd');

      // If rescheduling a pending appointment, change status to scheduled
      const updates: any = {
        date: newDate,
        time: newTime,
      };

      if (rescheduleAppointment.status === 'pending') {
        updates.status = 'scheduled';
      }

      await updateAppointment(rescheduleAppointment.id, updates);

      const message = rescheduleAppointment.status === 'pending'
        ? `Checkup scheduled for ${format(rescheduleDate, 'MMMM d, yyyy')} at ${newTime}`
        : `Appointment rescheduled to ${format(rescheduleDate, 'MMMM d, yyyy')} at ${newTime}`;

      Alert.alert('Success', message);
      setShowRescheduleModal(false);
      setRescheduleAppointment(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to reschedule appointment');
    }
  };

  const handleDeleteHistory = () => {
    const targetStatus = filterStatus === 'completed' ? 'completed' : 'cancelled';
    const targetAppointments = appointments.filter(apt => apt.status === targetStatus);
    
    if (targetAppointments.length === 0) {
      Alert.alert('No History', `No ${targetStatus} appointments to delete`);
      return;
    }

    Alert.alert(
      `Delete ${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)} History`,
      `Delete all ${targetAppointments.length} ${targetStatus} appointments? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const apt of targetAppointments) {
                await deleteAppointment(apt.id);
              }
              Alert.alert('Success', `${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)} appointment history deleted`);
            } catch (error) {
              console.error('Error deleting appointments:', error);
              Alert.alert('Error', 'Failed to delete appointments');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      case 'scheduled':
      default:
        return theme.colors.primary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Group appointments by date
  const groupedByDate = sortedAppointments.reduce((acc, apt) => {
    const dateKey = apt.date || 'No Date';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(apt);
    return acc;
  }, {} as Record<string, any[]>);

  const dateGroups = Object.entries(groupedByDate).map(([date, apts]) => ({
    date,
    appointments: apts,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Appointments</Text>
          <TouchableOpacity 
            style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleBookAppointment}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.statNumber, { color: theme.colors.warning }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
          </View>
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
      </View>

      {/* Filter Buttons */}
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterBtn,
                filterStatus === status
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.background }
              ]}
              onPress={() => setFilterStatus(status as AppointmentStatus)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterStatus === status
                    ? { color: '#fff' }
                    : { color: theme.colors.text }
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Clear History Button */}
      {(filterStatus === 'completed' || filterStatus === 'cancelled') && sortedAppointments.length > 0 && (
        <View style={[styles.clearHistoryContainer, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.clearHistoryButton, { backgroundColor: theme.colors.error }]}
            onPress={handleDeleteHistory}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.clearHistoryButtonText}>Clear {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} History</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Appointments List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {sortedAppointments.length > 0 ? (
          dateGroups.map((group) => (
            <View key={group.date}>
              <Text style={[styles.dateHeader, { color: theme.colors.text }]}>
                {format(new Date(group.date), 'EEEE, MMMM d, yyyy')}
              </Text>
              {group.appointments.map((appointment) => (
                <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.timeSection}>
                      <Text style={[styles.timeText, { color: theme.colors.primary }]}>{appointment.time}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status) + '20' }
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                        {getStatusLabel(appointment.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.patientName, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                    {appointment.appointmentType === 'vaccination' ? (
                      <Text style={[styles.vaccineText, { color: theme.colors.textSecondary }]}>
                        <Ionicons name="flask" size={14} /> {appointment.vaccine}
                      </Text>
                    ) : (
                      <Text style={[styles.vaccineText, { color: theme.colors.textSecondary }]}>
                        <Ionicons name="medical" size={14} /> Checkup: {appointment.reasonForCheckup}
                      </Text>
                    )}
                  </View>

                  {appointment.status === 'pending' && appointment.appointmentType === 'checkup' && (
                    <View style={styles.appointmentActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleScheduleCheckupDate(appointment)}
                      >
                        <Ionicons name="calendar" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Schedule Date</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => handleCancelAppointment(appointment)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {appointment.status === 'scheduled' && (
                    <View style={styles.appointmentActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.success }]}
                        onPress={() => handleCompleteAppointment(appointment)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleRescheduleAppointment(appointment)}
                      >
                        <Ionicons name="calendar" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => handleCancelAppointment(appointment)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {filterStatus === 'all'
                ? 'No appointments scheduled'
                : `No ${filterStatus} appointments`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {rescheduleAppointment && (
                <>
                  <View style={[styles.appointmentDetails, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Patient</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>{rescheduleAppointment.patientName}</Text>

                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>Vaccine</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>{rescheduleAppointment.vaccine}</Text>

                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>Current Time</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {rescheduleAppointment.time} on {format(new Date(rescheduleAppointment.date), 'MMM d, yyyy')}
                    </Text>
                  </View>

                  <Text style={[styles.label, { color: theme.colors.text }]}>Select New Date</Text>
                  <View style={styles.datePickerContainer}>
                    {/* Mini calendar for date selection */}
                    <View style={styles.miniCalendarHeader}>
                      <TouchableOpacity onPress={() => setRescheduleDate(addDays(rescheduleDate, -1))}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.miniCalendarDate, { color: theme.colors.text }]}>
                        {format(rescheduleDate, 'MMM d, yyyy')}
                      </Text>
                      <TouchableOpacity onPress={() => setRescheduleDate(addDays(rescheduleDate, 1))}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.label, { color: theme.colors.text }]}>Select New Time</Text>
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePickerSection}>
                      <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Hour</Text>
                      <View style={styles.timePickerButtons}>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => setRescheduleHour(String(Math.max(0, parseInt(rescheduleHour) - 1)).padStart(2, '0'))}
                        >
                          <Ionicons name="chevron-up" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                          {rescheduleHour}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => setRescheduleHour(String(Math.min(23, parseInt(rescheduleHour) + 1)).padStart(2, '0'))}
                        >
                          <Ionicons name="chevron-down" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.timeSeparator, { color: theme.colors.text }]}>:</Text>

                    <View style={styles.timePickerSection}>
                      <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Minute</Text>
                      <View style={styles.timePickerButtons}>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => setRescheduleMinute(String(Math.max(0, parseInt(rescheduleMinute) - 15)).padStart(2, '0'))}
                        >
                          <Ionicons name="chevron-up" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                          {rescheduleMinute}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => setRescheduleMinute(String(Math.min(59, parseInt(rescheduleMinute) + 15)).padStart(2, '0'))}
                        >
                          <Ionicons name="chevron-down" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowRescheduleModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveReschedule}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Book Appointment</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Select Date</Text>
              
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
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarGridDay,
                          { backgroundColor: isSelected ? theme.colors.primary : theme.colors.background },
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Patient</Text>
              
              {/* Search */}
              <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Search patients or families..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={patientSearchQuery}
                  onChangeText={setPatientSearchQuery}
                />
              </View>

              {/* Family-grouped patients */}
              <View style={styles.familyList}>
                {patientSearchQuery.trim() ? (
                  filteredFamiliesForBooking.length > 0 ? (
                    filteredFamiliesForBooking.map((family) => (
                      <View key={family.owner.id} style={[styles.familyCard, { borderColor: theme.colors.border }]}>
                        <TouchableOpacity
                          style={[styles.familyHeader, { backgroundColor: theme.colors.background }]}
                          onPress={() => toggleFamilyInModal(family.owner.id)}
                        >
                          <Text style={[styles.familyTitle, { color: theme.colors.text }]}>
                            {family.owner.name}
                          </Text>
                          <Ionicons
                            name={expandedFamilies.has(family.owner.id) ? 'chevron-down' : 'chevron-forward'}
                            size={20}
                            color={theme.colors.primary}
                          />
                        </TouchableOpacity>

                        {expandedFamilies.has(family.owner.id) && (
                          <View style={[styles.familyMembersList, { borderTopColor: theme.colors.border }]}>
                            {family.members.map((member) => (
                              <TouchableOpacity
                                key={member.id}
                                style={[
                                  styles.patientOption,
                                  { borderColor: theme.colors.border, backgroundColor: selectedPatient === member.name ? theme.colors.primary + '20' : 'transparent' }
                                ]}
                                onPress={() => setSelectedPatient(member.name)}
                              >
                                <View style={styles.patientOptionContent}>
                                  <Text style={[styles.patientOptionText, { color: theme.colors.text }]}>
                                    {member.name}
                                  </Text>
                                  <Text style={[styles.patientOptionSubtext, { color: theme.colors.textSecondary }]}>
                                    {member.relationship} • {member.age}y
                                  </Text>
                                </View>
                                {selectedPatient === member.name && (
                                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                      No patients found
                    </Text>
                  )
                ) : (
                  <Text style={[styles.searchPrompt, { color: theme.colors.textSecondary }]}>
                    Start typing to search for patients
                  </Text>
                )}
              </View>

              <Text style={[styles.label, { color: theme.colors.text }]}>Appointment Type</Text>
              <View style={styles.appointmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.appointmentTypeButton,
                    {
                      backgroundColor: appointmentType === 'vaccination' ? theme.colors.primary : theme.colors.background,
                      borderColor: appointmentType === 'vaccination' ? theme.colors.primary : theme.colors.border,
                    }
                  ]}
                  onPress={() => {
                    setAppointmentType('vaccination');
                    setSelectedCheckupReason('');
                  }}
                >
                  <Ionicons 
                    name="flask" 
                    size={18} 
                    color={appointmentType === 'vaccination' ? '#fff' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.appointmentTypeButtonText,
                    { color: appointmentType === 'vaccination' ? '#fff' : theme.colors.text }
                  ]}>
                    Vaccination
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.appointmentTypeButton,
                    {
                      backgroundColor: appointmentType === 'checkup' ? theme.colors.primary : theme.colors.background,
                      borderColor: appointmentType === 'checkup' ? theme.colors.primary : theme.colors.border,
                    }
                  ]}
                  onPress={() => {
                    setAppointmentType('checkup');
                    setSelectedVaccine('');
                  }}
                >
                  <Ionicons 
                    name="medical" 
                    size={18} 
                    color={appointmentType === 'checkup' ? '#fff' : theme.colors.primary} 
                  />
                  <Text style={[
                    styles.appointmentTypeButtonText,
                    { color: appointmentType === 'checkup' ? '#fff' : theme.colors.text }
                  ]}>
                    Checkup
                  </Text>
                </TouchableOpacity>
              </View>

              {appointmentType === 'vaccination' ? (
                <>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Vaccine Name</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                    placeholder="Enter vaccine name (e.g., COVID-19, Flu)"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={selectedVaccine}
                    onChangeText={setSelectedVaccine}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Reason for Checkup</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                    placeholder="Enter reason (e.g., General physical, Follow-up)"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={selectedCheckupReason}
                    onChangeText={setSelectedCheckupReason}
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.colors.text }]}>Time</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Hour</Text>
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedHour(String(Math.max(0, parseInt(selectedHour) - 1)).padStart(2, '0'))}
                    >
                      <Ionicons name="chevron-up" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                      {selectedHour}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedHour(String(Math.min(23, parseInt(selectedHour) + 1)).padStart(2, '0'))}
                    >
                      <Ionicons name="chevron-down" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.timeSeparator, { color: theme.colors.text }]}>:</Text>

                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Minute</Text>
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedMinute(String(Math.max(0, parseInt(selectedMinute) - 15)).padStart(2, '0'))}
                    >
                      <Ionicons name="chevron-up" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                      {selectedMinute}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedMinute(String(Math.min(59, parseInt(selectedMinute) + 15)).padStart(2, '0'))}
                    >
                      <Ionicons name="chevron-down" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveAppointment}
              >
                <Text style={styles.saveButtonText}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterScroll: {
    flex: 1,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
  },
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSection: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentInfo: {
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vaccineText: {
    fontSize: 13,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
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
  calendarSection: {
    gap: 12,
    marginBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  familyList: {
    gap: 8,
    marginBottom: 16,
  },
  familyCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  familyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  familyMembersList: {
    borderTopWidth: 1,
  },
  patientOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  patientOptionContent: {
    flex: 1,
  },
  patientOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  patientOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  noResults: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
  searchPrompt: {
    textAlign: 'center',
    padding: 40,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timePickerSection: {
    alignItems: 'center',
    gap: 8,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timePickerButtons: {
    alignItems: 'center',
    gap: 4,
  },
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  appointmentDetails: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  miniCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  miniCalendarDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  appointmentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  appointmentTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearHistoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  clearHistoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },});