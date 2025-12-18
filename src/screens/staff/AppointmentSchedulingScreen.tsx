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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../context/auth-context';
import { useStaffPatients } from '../../context/staff-patients-context';
import { useAppointments } from '../../context/appointments-context';
import { format, addDays, startOfWeek, getDaysInMonth, getDay, startOfMonth, endOfMonth } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function AppointmentSchedulingScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { staffPatients, updateStaffPatient } = useStaffPatients();
  // Use staffPatients as familyMembers for compatibility
  const familyMembers = staffPatients;
  const { appointments, addAppointment, updateAppointment, cancelAppointment, completeAppointment, deleteAppointment } = useAppointments();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingAppointment, setReviewingAppointment] = useState<any>(null);
  const [reviewDate, setReviewDate] = useState(new Date());
  const [reviewHour, setReviewHour] = useState('08');
  const [reviewMinute, setReviewMinute] = useState('00');
  const [reviewPeriod, setReviewPeriod] = useState<'AM' | 'PM'>('AM');

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date()), i);
    return {
      date,
      day: format(date, 'EEE'),
      num: format(date, 'd'),
    };
  });

  const todayAppointments = appointments.filter(
    apt => apt.date === format(selectedDate, 'yyyy-MM-dd') && apt.status === 'scheduled'
  );

  // Filter pending patient requests for this staff member
  const pendingRequests = appointments.filter(
    apt => apt.status === 'pending' && apt.staffId === user?.id
  );

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
      // Expand all filtered families when searching
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

  const handleBookAppointment = () => {
    setShowBookingModal(true);
    setPatientSearchQuery('');
    setExpandedFamilies(new Set());
  };

  const handleSaveAppointment = async () => {
    // Validation
    const errors = [];
    
    if (!selectedPatient.trim()) {
      errors.push('Please select a patient');
    }
    
    if (!selectedVaccine.trim()) {
      errors.push('Please enter a vaccine name');
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
    
    // Convert 12-hour format to 24-hour format
    let hour24 = parseInt(selectedHour);
    if (selectedPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (selectedPeriod === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const formattedTime = `${hour24.toString().padStart(2, '0')}:${selectedMinute}`;
    
    // Create new appointment (without id - Firebase will generate it)
    const newAppointment = {
      patientId: patient.id,
      patientName: selectedPatient,
      appointmentType: 'vaccination' as const,
      vaccine: selectedVaccine,
      time: formattedTime,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'scheduled' as const,
      userId: patient.familyGroupId || patient.id, // Use familyGroupId (actual user ID) if exists, fallback to patient ID
      staffId: user?.id, // Link to staff who booked it
      staffName: user?.name || 'Staff',
      bookedByStaff: true,
    };

    try {
      // Add appointment to Firestore
      await addAppointment(newAppointment);
    
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

      // Send notification to patient if they have a registered account
      if (patient.familyGroupId) {
        await addDoc(collection(db, 'notifications'), {
          userId: patient.familyGroupId,
          memberName: patient.name,
          message: `New vaccination appointment scheduled: ${selectedVaccine} on ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedHour}:${selectedMinute} ${selectedPeriod}`,
          date: new Date().toISOString(),
          type: 'Info',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
      
      Alert.alert('Success', `Appointment booked for ${selectedPatient}\n${selectedVaccine} at ${selectedHour}:${selectedMinute} ${selectedPeriod}\n${format(selectedDate, 'MMMM d, yyyy')}`);
      setShowBookingModal(false);
      setSelectedPatient('');
      setSelectedVaccine('');
      setSelectedHour('08');
      setSelectedMinute('00');
      setSelectedPeriod('AM');
      setPatientSearchQuery('');
      setExpandedFamilies(new Set());
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    }
  };

  const handleCancelAppointment = (appointment: any) => {
    Alert.alert(
      'Cancel Appointment',
      `Cancel ${appointment.patientName}'s ${appointment.appointmentType === 'vaccination' ? appointment.vaccine : 'checkup'} at ${appointment.time}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await cancelAppointment(appointment.id);

              // Send notification to patient
              if (appointment.userId) {
                await addDoc(collection(db, 'notifications'), {
                  userId: appointment.userId,
                  memberName: appointment.patientName,
                  message: `Your ${appointment.appointmentType === 'vaccination' ? 'vaccination' : 'checkup'} appointment scheduled for ${format(new Date(appointment.date), 'MMMM d, yyyy')} at ${appointment.time} has been cancelled by staff.`,
                  date: new Date().toISOString(),
                  type: 'Info',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });
              }

              Alert.alert('Success', 'Appointment cancelled and patient notified');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        },
      ]
    );
  };

  const handleCompleteAppointment = (appointment: any) => {
    Alert.alert(
      'Complete Appointment',
      `Mark ${appointment.patientName}'s ${appointment.appointmentType === 'vaccination' ? appointment.vaccine : 'checkup'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: async () => {
            try {
              await completeAppointment(appointment.id);

              // Send notification to patient
              if (appointment.userId) {
                await addDoc(collection(db, 'notifications'), {
                  userId: appointment.userId,
                  memberName: appointment.patientName,
                  message: `Your ${appointment.appointmentType === 'vaccination' ? 'vaccination' : 'checkup'} appointment has been completed. Thank you for visiting!`,
                  date: new Date().toISOString(),
                  type: 'Info',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });
              }

              Alert.alert('Success', 'Appointment marked as completed and patient notified');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete appointment');
            }
          }
        },
      ]
    );
  };

  const handleDeleteCompletedHistory = () => {
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    
    Alert.alert(
      'Delete Completed History',
      `Delete all ${completedAppointments.length} completed appointments? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const apt of completedAppointments) {
                await deleteAppointment(apt.id);
              }
              Alert.alert('Success', 'Completed appointment history deleted');
            } catch (error) {
              console.error('Error deleting completed appointments:', error);
              Alert.alert('Error', 'Failed to delete completed appointments');
            }
          }
        }
      ]
    );
  };

  const handleDeleteCancelledHistory = () => {
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
    
    Alert.alert(
      'Delete Cancelled History',
      `Delete all ${cancelledAppointments.length} cancelled appointments? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const apt of cancelledAppointments) {
                await deleteAppointment(apt.id);
              }
              Alert.alert('Success', 'Cancelled appointment history deleted');
            } catch (error) {
              console.error('Error deleting cancelled appointments:', error);
              Alert.alert('Error', 'Failed to delete cancelled appointments');
            }
          }
        }
      ]
    );
  };

  const handleReviewRequest = (appointment: any) => {
    setReviewingAppointment(appointment);
    setReviewDate(new Date(appointment.date));
    
    // Parse existing time to 12-hour format
    if (appointment.time) {
      const [hours24, minutes] = appointment.time.split(':').map(Number);
      let hours12 = hours24 % 12;
      if (hours12 === 0) hours12 = 12;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      
      setReviewHour(hours12.toString().padStart(2, '0'));
      setReviewMinute(minutes.toString().padStart(2, '0'));
      setReviewPeriod(period);
    }
    
    setShowReviewModal(true);
  };

  const handleApproveRequest = async () => {
    if (!reviewingAppointment) return;
    
    try {
      // Convert 12-hour to 24-hour format
      let hour24 = parseInt(reviewHour);
      if (reviewPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (reviewPeriod === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      const time24 = `${hour24.toString().padStart(2, '0')}:${reviewMinute}`;
      const scheduledDate = format(reviewDate, 'yyyy-MM-dd');
      
      await updateAppointment(reviewingAppointment.id, {
        status: 'scheduled',
        date: scheduledDate,
        time: time24,
      });

      // Send notification to patient
      await addDoc(collection(db, 'notifications'), {
        userId: reviewingAppointment.userId,
        memberName: reviewingAppointment.patientName,
        message: `Your checkup appointment has been approved! Scheduled for ${format(reviewDate, 'MMMM d, yyyy')} at ${reviewHour}:${reviewMinute} ${reviewPeriod}`,
        date: new Date().toISOString(),
        type: 'Info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', `Appointment approved for ${reviewingAppointment.patientName}`);
      setShowReviewModal(false);
      setReviewingAppointment(null);
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleDeclineRequest = () => {
    if (!reviewingAppointment) return;
    
    Alert.alert(
      'Decline Request',
      `Decline checkup request from ${reviewingAppointment.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(reviewingAppointment.id);

              // Send notification to patient
              await addDoc(collection(db, 'notifications'), {
                userId: reviewingAppointment.userId,
                memberName: reviewingAppointment.patientName,
                message: `Your checkup request has been declined. Please contact the clinic for more information or submit a new request.`,
                date: new Date().toISOString(),
                type: 'Info',
                isRead: false,
                createdAt: new Date().toISOString(),
              });

              Alert.alert('Request Declined', 'The patient has been notified');
              setShowReviewModal(false);
              setReviewingAppointment(null);
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [showCalendar, setShowCalendar] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false);

  // Filter appointments by status
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
  const scheduledAppointments = appointments.filter(apt => apt.status === 'scheduled');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.simpleHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Appointments</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleBookAppointment}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Summary Stats */}
        <View style={[styles.summaryContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: theme.colors.warning }]}>{pendingRequests.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.warning }]}>Pending</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: theme.colors.success }]}>{scheduledAppointments.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Scheduled</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: theme.colors.primary }]}>{completedAppointments.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.primary }]}>Completed</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: theme.colors.error }]}>{cancelledAppointments.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.error }]}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Calendar and Filter */}
        <View style={styles.calendarSection}>
          <TouchableOpacity
            style={[styles.calendarButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.calendarButtonText, { color: theme.colors.text }]}>
              {filterDate ? format(filterDate, 'MMM d, yyyy') : 'All Dates'}
            </Text>
            {filterDate && (
              <TouchableOpacity
                onPress={() => setFilterDate(null)}
                style={styles.clearDateBtn}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
            <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {showCalendar && (
            <View style={[styles.calendarGrid, { backgroundColor: theme.colors.card }]}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => setCurrentMonth(addDays(currentMonth, -30))}>
                  <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.calendarMonthText, { color: theme.colors.text }]}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addDays(currentMonth, 30))}>
                  <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarWeekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={[styles.weekDayText, { color: theme.colors.textSecondary }]}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarDaysGrid}>
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isSelected = filterDate && format(day, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const hasAppointments = appointments.some(
                    apt => apt.date === format(day, 'yyyy-MM-dd') && 
                    (apt.status === 'scheduled' || apt.status === 'pending')
                  );

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonth && styles.calendarDayInactive,
                        isSelected && { backgroundColor: theme.colors.primary },
                        isToday && !isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => {
                        setFilterDate(day);
                        setShowCalendar(false);
                      }}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        { color: isSelected ? '#fff' : isCurrentMonth ? theme.colors.text : theme.colors.textTertiary }
                      ]}>
                        {format(day, 'd')}
                      </Text>
                      {hasAppointments && (
                        <View style={[styles.appointmentDot, { backgroundColor: isSelected ? '#fff' : theme.colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.primaryActionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleBookAppointment}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.primaryActionButtonText}>Book Appointment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryActionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.secondaryActionButtonText, { color: theme.colors.primary }]}>Appointment History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.warningActionButton, 
              { backgroundColor: pendingRequests.length > 0 ? theme.colors.warning : theme.colors.card },
              pendingRequests.length === 0 && { borderWidth: 2, borderColor: theme.colors.border }
            ]}
            onPress={() => setShowPendingRequestsModal(true)}
          >
            <Ionicons 
              name={pendingRequests.length > 0 ? "alert-circle" : "checkmark-circle"} 
              size={20} 
              color={pendingRequests.length > 0 ? "#fff" : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.warningActionButtonText,
              { color: pendingRequests.length > 0 ? "#fff" : theme.colors.textSecondary }
            ]}>
              {pendingRequests.length > 0 ? `Review Requests (${pendingRequests.length})` : 'No Pending Requests'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Requests</Text>
              {filterDate && pendingRequests.filter(req => req.date === format(filterDate, 'yyyy-MM-dd')).length !== pendingRequests.length && (
                <Text style={[styles.sectionCount, { color: theme.colors.textTertiary }]}>
                  {pendingRequests.filter(req => req.date === format(filterDate, 'yyyy-MM-dd')).length} of {pendingRequests.length}
                </Text>
              )}
            </View>
            {pendingRequests.filter(req => !filterDate || req.date === format(filterDate, 'yyyy-MM-dd')).map((request) => (
              <View key={request.id} style={[styles.appointmentCardSimple, { backgroundColor: theme.colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: theme.colors.warning }]}>Pending</Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="fitness" size={12} color={theme.colors.primary} />
                    <Text style={[styles.typeText, { color: theme.colors.primary }]}>Checkup</Text>
                  </View>
                </View>
                
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{request.patientName}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {request.reasonForCheckup}
                </Text>
                <Text style={[styles.cardDate, { color: theme.colors.textTertiary }]}>
                  Requested on {request.date ? format(new Date(request.date), 'MMM d, yyyy') : 'N/A'}
                </Text>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleReviewRequest(request)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { backgroundColor: theme.colors.error }]}
                    onPress={() => {
                      setReviewingAppointment(request);
                      handleDeclineRequest();
                    }}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.cancelBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Scheduled Appointments */}
        {scheduledAppointments.filter(apt => !filterDate || apt.date === format(filterDate, 'yyyy-MM-dd')).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 16 }]}>
              Scheduled Appointments
            </Text>
            {scheduledAppointments.filter(apt => !filterDate || apt.date === format(filterDate, 'yyyy-MM-dd')).map((appointment) => (
              <View key={appointment.id} style={[styles.appointmentCardSimple, { backgroundColor: theme.colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
                    <Text style={[styles.statusText, { color: theme.colors.success }]}>Scheduled</Text>
                  </View>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                  ]}>
                    <Ionicons 
                      name={appointment.appointmentType === 'vaccination' ? 'medical' : 'fitness'} 
                      size={12} 
                      color={appointment.appointmentType === 'vaccination' ? '#10B981' : theme.colors.primary} 
                    />
                    <Text style={[styles.typeText, { color: appointment.appointmentType === 'vaccination' ? '#10B981' : theme.colors.primary }]}>
                      {appointment.appointmentType === 'vaccination' ? 'Vaccination' : 'Checkup'}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {appointment.vaccine || appointment.reasonForCheckup || 'No details'}
                </Text>
                <Text style={[styles.cardDate, { color: theme.colors.textTertiary }]}>
                  {appointment.date ? format(new Date(appointment.date), 'MMM d, yyyy') : 'No date'} at {appointment.time || 'No time'}
                </Text>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.completeBtn, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleCompleteAppointment(appointment)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleCancelAppointment(appointment)}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {pendingRequests.filter(req => !filterDate || req.date === format(filterDate, 'yyyy-MM-dd')).length === 0 && 
         scheduledAppointments.filter(apt => !filterDate || apt.date === format(filterDate, 'yyyy-MM-dd')).length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {filterDate ? 'No appointments on this date' : 'No appointments'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              {filterDate ? 'Try selecting a different date' : 'Book a vaccination appointment to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Appointment History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterTabs}
              contentContainerStyle={styles.filterTabsContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  historyFilter === 'scheduled' && [styles.filterTabActive, { backgroundColor: theme.colors.success }]
                ]}
                onPress={() => setHistoryFilter('scheduled')}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: historyFilter === 'scheduled' ? '#fff' : theme.colors.text }
                ]}>
                  Scheduled
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTab,
                  historyFilter === 'completed' && [styles.filterTabActive, { backgroundColor: theme.colors.primary }]
                ]}
                onPress={() => setHistoryFilter('completed')}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: historyFilter === 'completed' ? '#fff' : theme.colors.text }
                ]}>
                  Completed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTab,
                  historyFilter === 'cancelled' && [styles.filterTabActive, { backgroundColor: theme.colors.error }]
                ]}
                onPress={() => setHistoryFilter('cancelled')}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: historyFilter === 'cancelled' ? '#fff' : theme.colors.text }
                ]}>
                  Cancelled
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <ScrollView style={styles.modalBody}>
              {historyFilter === 'scheduled' && (
                <>
                  {scheduledAppointments.length > 0 ? (
                    scheduledAppointments.map((appointment) => (
                      <View key={appointment.id} style={[styles.historyCard, { backgroundColor: theme.colors.background }]}>
                        <View style={styles.cardHeader}>
                          <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
                            <Text style={[styles.statusText, { color: theme.colors.success }]}>Scheduled</Text>
                          </View>
                          <View style={[
                            styles.typeBadge,
                            { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                          ]}>
                            <Ionicons 
                              name={appointment.appointmentType === 'vaccination' ? 'medical' : 'fitness'} 
                              size={12} 
                              color={appointment.appointmentType === 'vaccination' ? '#10B981' : theme.colors.primary} 
                            />
                            <Text style={[styles.typeText, { color: appointment.appointmentType === 'vaccination' ? '#10B981' : theme.colors.primary }]}>
                              {appointment.appointmentType === 'vaccination' ? 'Vaccination' : 'Checkup'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.historyPatient, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                        <Text style={[styles.historyDetail, { color: theme.colors.textSecondary }]}>
                          {appointment.vaccine || appointment.reasonForCheckup}
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.colors.textTertiary }]}>
                          {appointment.date ? format(new Date(appointment.date), 'MMM d, yyyy') : ''} • {appointment.time}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                      No scheduled appointments
                    </Text>
                  )}
                </>
              )}

              {historyFilter === 'completed' && (
                <>
                  <View style={styles.sectionHeaderWithAction}>
                    {completedAppointments.length > 0 && (
                      <TouchableOpacity
                        style={[styles.deleteHistoryBtn, { backgroundColor: theme.colors.error, marginLeft: 'auto' }]}
                        onPress={handleDeleteCompletedHistory}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                        <Text style={styles.deleteHistoryText}>Clear All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {completedAppointments.length > 0 ? (
                    completedAppointments.map((appointment) => (
                      <View key={appointment.id} style={[styles.historyCard, { backgroundColor: theme.colors.background }]}>
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Text style={[styles.statusText, { color: theme.colors.primary }]}>Completed</Text>
                        </View>
                        <Text style={[styles.historyPatient, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                        <Text style={[styles.historyDetail, { color: theme.colors.textSecondary }]}>
                          {appointment.vaccine || appointment.reasonForCheckup}
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.colors.textTertiary }]}>
                          {appointment.date ? format(new Date(appointment.date), 'MMM d, yyyy') : ''} • {appointment.time}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                      No completed appointments
                    </Text>
                  )}
                </>
              )}

              {historyFilter === 'cancelled' && (
                <>
                  <View style={styles.sectionHeaderWithAction}>
                    {cancelledAppointments.length > 0 && (
                      <TouchableOpacity
                        style={[styles.deleteHistoryBtn, { backgroundColor: theme.colors.error, marginLeft: 'auto' }]}
                        onPress={handleDeleteCancelledHistory}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                        <Text style={styles.deleteHistoryText}>Clear All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {cancelledAppointments.length > 0 ? (
                    cancelledAppointments.map((appointment) => (
                      <View key={appointment.id} style={[styles.historyCard, { backgroundColor: theme.colors.background }]}>
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.error + '20' }]}>
                          <Text style={[styles.statusText, { color: theme.colors.error }]}>Cancelled</Text>
                        </View>
                        <Text style={[styles.historyPatient, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                        <Text style={[styles.historyDetail, { color: theme.colors.textSecondary }]}>
                          {appointment.vaccine || appointment.reasonForCheckup}
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.colors.textTertiary }]}>
                          {appointment.date ? format(new Date(appointment.date), 'MMM d, yyyy') : ''} • {appointment.time}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                      No cancelled appointments
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pending Requests Modal */}
      <Modal
        visible={showPendingRequestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPendingRequestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Pending Requests ({pendingRequests.length})
              </Text>
              <TouchableOpacity onPress={() => setShowPendingRequestsModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <View key={request.id} style={[styles.requestCard, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                        <Text style={[styles.statusText, { color: theme.colors.warning }]}>Pending</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Ionicons name="fitness" size={12} color={theme.colors.primary} />
                        <Text style={[styles.typeText, { color: theme.colors.primary }]}>Checkup</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{request.patientName}</Text>
                    {request.familyMemberRelationship && request.familyMemberRelationship !== 'Me' && (
                      <Text style={[styles.cardRelationship, { color: theme.colors.primary }]}>
                        {request.familyMemberRelationship} of {request.familyOwnerName}
                      </Text>
                    )}
                    {request.familyOwnerEmail && (
                      <Text style={[styles.cardFamilyInfo, { color: theme.colors.textTertiary }]}>
                        <Ionicons name="people" size={12} color={theme.colors.textTertiary} /> Family: {request.familyOwnerEmail}
                      </Text>
                    )}
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                      {request.reasonForCheckup}
                    </Text>
                    <Text style={[styles.cardDate, { color: theme.colors.textTertiary }]}>
                      Requested on {request.date ? format(new Date(request.date), 'MMM d, yyyy') : 'N/A'}
                    </Text>
                    
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => {
                          setShowPendingRequestsModal(false);
                          handleReviewRequest(request);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => {
                          setShowPendingRequestsModal(false);
                          setReviewingAppointment(request);
                          handleDeclineRequest();
                        }}
                      >
                        <Ionicons name="trash" size={18} color="#fff" />
                        <Text style={styles.cancelBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateModal}>
                  <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No Pending Requests
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                    All checkup requests have been reviewed
                  </Text>
                </View>
              )}
            </ScrollView>
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

            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.label, { color: theme.colors.text }]}>Patient</Text>
              
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
                    filteredFamiliesForBooking.map((family) => {
                      const isExpanded = expandedFamilies.has(family.owner.id);
                      
                      return (
                        <View key={family.owner.id} style={[styles.familyCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                          <TouchableOpacity 
                            style={styles.familyHeader}
                            onPress={() => toggleFamilyInModal(family.owner.id)}
                          >
                            <Text style={[styles.familyTitle, { color: theme.colors.text }]}>
                              {family.owner.name.split(' ')[1]} Family ({family.members.length})
                            </Text>
                            <Ionicons 
                              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                              size={20} 
                              color={theme.colors.textSecondary} 
                            />
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={styles.familyMembersList}>
                              {family.members.map((member) => (
                                <TouchableOpacity
                                  key={member.id}
                                  style={[
                                    styles.patientOption,
                                    { 
                                      backgroundColor: selectedPatient === member.name ? theme.colors.primary : 'transparent',
                                      borderColor: selectedPatient === member.name ? theme.colors.primary : theme.colors.border,
                                    }
                                  ]}
                                  onPress={() => setSelectedPatient(member.name)}
                                >
                                  <View style={styles.patientOptionContent}>
                                    <Text style={[
                                      styles.patientOptionText,
                                      { color: selectedPatient === member.name ? '#fff' : theme.colors.text }
                                    ]}>
                                      {member.name}
                                      {member.relationship === 'Me' && (
                                        <Text style={{ fontSize: 11, opacity: 0.8 }}> (Owner)</Text>
                                      )}
                                    </Text>
                                    <Text style={[
                                      styles.patientOptionSubtext,
                                      { color: selectedPatient === member.name ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
                                    ]}>
                                      {member.age} years • {member.relationship}
                                    </Text>
                                  </View>
                                  {selectedPatient === member.name && (
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                      No patients found
                    </Text>
                  )
                ) : (
                  <Text style={[styles.searchPrompt, { color: theme.colors.textSecondary }]}>
                    Search for a patient or family to begin
                  </Text>
                )}
              </View>

              {patientSearchQuery.trim() && filteredFamiliesForBooking.length === 0 && (
                <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                  No patients found
                </Text>
              )}

              <Text style={[styles.label, { color: theme.colors.text }]}>Vaccine</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter vaccine name (e.g., MMR, DTaP)"
                placeholderTextColor={theme.colors.textTertiary}
                value={selectedVaccine}
                onChangeText={setSelectedVaccine}
              />

              <Text style={[styles.label, { color: theme.colors.text }]}>Time</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Hour</Text>
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        let newHour = parseInt(selectedHour) + 1;
                        if (newHour > 12) newHour = 1;
                        setSelectedHour(newHour.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-up" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                      {selectedHour}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        let newHour = parseInt(selectedHour) - 1;
                        if (newHour < 1) newHour = 12;
                        setSelectedHour(newHour.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-down" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.timeSeparator, { color: theme.colors.text }]}>:</Text>

                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Minute</Text>
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedMinute(prev => {
                        const minute = (parseInt(prev) + 5) % 60;
                        return minute.toString().padStart(2, '0');
                      })}
                    >
                      <Ionicons name="chevron-up" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                      {selectedMinute}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedMinute(prev => {
                        const minute = (parseInt(prev) - 5 + 60) % 60;
                        return minute.toString().padStart(2, '0');
                      })}
                    >
                      <Ionicons name="chevron-down" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Period</Text>
                  <View style={styles.periodSelector}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        { borderColor: theme.colors.border },
                        selectedPeriod === 'AM' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setSelectedPeriod('AM')}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        { color: selectedPeriod === 'AM' ? '#fff' : theme.colors.text }
                      ]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        { borderColor: theme.colors.border },
                        selectedPeriod === 'PM' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setSelectedPeriod('PM')}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        { color: selectedPeriod === 'PM' ? '#fff' : theme.colors.text }
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
              
              {/* Inline Calendar */}
              <View style={[styles.inlineCalendar, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                {/* Month Navigation */}
                <View style={styles.calendarMonthNav}>
                  <TouchableOpacity 
                    onPress={() => setCurrentMonth(addDays(currentMonth, -30))}
                    style={styles.monthNavBtn}
                  >
                    <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonthTitle, { color: theme.colors.text }]}>
                    {format(currentMonth, 'MMMM yyyy')}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setCurrentMonth(addDays(currentMonth, 30))}
                    style={styles.monthNavBtn}
                  >
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Day Headers */}
                <View style={styles.calendarDayHeaders}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <Text key={idx} style={[styles.calendarDayHeaderText, { color: theme.colors.textSecondary }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days Grid */}
                <View style={styles.calendarDaysContainer}>
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
                    const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.inlineCalendarDay,
                          { borderColor: theme.colors.border },
                          isSelected && { backgroundColor: theme.colors.primary },
                          !isCurrentMonth && { opacity: 0.3 },
                          isToday && !isSelected && { borderWidth: 2, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => setSelectedDate(day)}
                      >
                        <Text style={[
                          styles.inlineCalendarDayText,
                          { color: isSelected ? '#fff' : theme.colors.text }
                        ]}>
                          {format(day, 'd')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={{ height: 80 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => {
                  setShowBookingModal(false);
                  setSelectedPatient('');
                  setSelectedVaccine('');
                  setSelectedHour('08');
                  setSelectedMinute('00');
                  setPatientSearchQuery('');
                  setExpandedFamilies(new Set());
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { 
                    backgroundColor: (!selectedPatient || !selectedVaccine) 
                      ? theme.colors.border 
                      : theme.colors.primary 
                  }
                ]}
                onPress={handleSaveAppointment}
                disabled={!selectedPatient || !selectedVaccine}
              >
                <Text style={[styles.saveButtonText, { opacity: (!selectedPatient || !selectedVaccine) ? 0.5 : 1 }]}>
                  Book Appointment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={[styles.calendarModalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.calendarModalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.calendarModalTitle, { color: theme.colors.text }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowCalendarModal(false)}
              style={styles.calendarCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.calendarModalContent, { backgroundColor: theme.colors.background }]}>
            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity 
                onPress={() => setCurrentMonth(addDays(currentMonth, -30))}
                style={styles.navButton}
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setCurrentMonth(addDays(currentMonth, 30))}
                style={styles.navButton}
              >
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={[styles.dayHeader, { color: theme.colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const dayAppointments = appointments.filter(apt => apt.date === format(day, 'yyyy-MM-dd'));
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      { backgroundColor: isSelected ? theme.colors.primary : theme.colors.card },
                      !isCurrentMonth && { backgroundColor: theme.colors.background },
                      isToday && !isSelected && { borderWidth: 2, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => {
                      setSelectedDate(day);
                      if (showReviewModal) {
                        setReviewDate(day);
                      }
                      setShowCalendarModal(false);
                    }}
                  >
                    <Text style={[
                      styles.calendarDayNumber,
                      { color: isSelected ? '#fff' : (isCurrentMonth ? theme.colors.text : theme.colors.textTertiary) }
                    ]}>
                      {format(day, 'd')}
                    </Text>
                    {dayAppointments.length > 0 && (
                      <View style={styles.appointmentIndicator}>
                        <Text style={[styles.appointmentDot, { color: isSelected ? '#fff' : theme.colors.primary }]}>
                          •
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Appointment Request Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Review Appointment Request</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {reviewingAppointment && (
                <>
                  <View style={[styles.infoSection, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Patient</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{reviewingAppointment.patientName}</Text>
                    {reviewingAppointment.familyMemberRelationship && reviewingAppointment.familyMemberRelationship !== 'Me' && (
                      <Text style={[styles.infoSubvalue, { color: theme.colors.primary }]}>
                        {reviewingAppointment.familyMemberRelationship} of {reviewingAppointment.familyOwnerName}
                      </Text>
                    )}
                  </View>

                  {reviewingAppointment.familyOwnerEmail && (
                    <View style={[styles.infoSection, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Family Account Owner</Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{reviewingAppointment.familyOwnerName}</Text>
                      <Text style={[styles.infoSubvalue, { color: theme.colors.textTertiary }]}>{reviewingAppointment.familyOwnerEmail}</Text>
                    </View>
                  )}
                  
                  <View style={[styles.infoSection, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Reason for Checkup</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{reviewingAppointment.reasonForCheckup}</Text>
                  </View>

                  <View style={[styles.infoSection, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Requested Date & Time</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {format(new Date(reviewingAppointment.date), 'MMMM d, yyyy')} at {reviewingAppointment.time}
                    </Text>
                  </View>

                  <Text style={[styles.label, { color: theme.colors.text, marginTop: 20 }]}>Adjust Date (Optional)</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={() => setShowCalendarModal(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                      {format(reviewDate, 'MMMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Adjust Time (Optional)</Text>
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePickerSection}>
                      <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Hour</Text>
                      <View style={styles.timePickerButtons}>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => {
                            let newHour = parseInt(reviewHour) + 1;
                            if (newHour > 12) newHour = 1;
                            setReviewHour(newHour.toString().padStart(2, '0'));
                          }}
                        >
                          <Ionicons name="chevron-up" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                          {reviewHour}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => {
                            let newHour = parseInt(reviewHour) - 1;
                            if (newHour < 1) newHour = 12;
                            setReviewHour(newHour.toString().padStart(2, '0'));
                          }}
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
                          onPress={() => {
                            const newMinute = (parseInt(reviewMinute) + 15) % 60;
                            setReviewMinute(newMinute.toString().padStart(2, '0'));
                          }}
                        >
                          <Ionicons name="chevron-up" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                          {reviewMinute}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => {
                            const newMinute = (parseInt(reviewMinute) - 15 + 60) % 60;
                            setReviewMinute(newMinute.toString().padStart(2, '0'));
                          }}
                        >
                          <Ionicons name="chevron-down" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.timePickerSection}>
                      <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Period</Text>
                      <View style={styles.periodSelector}>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            { borderColor: theme.colors.border },
                            reviewPeriod === 'AM' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          ]}
                          onPress={() => setReviewPeriod('AM')}
                        >
                          <Text style={[
                            styles.periodButtonText,
                            { color: reviewPeriod === 'AM' ? '#fff' : theme.colors.text }
                          ]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            { borderColor: theme.colors.border },
                            reviewPeriod === 'PM' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          ]}
                          onPress={() => setReviewPeriod('PM')}
                        >
                          <Text style={[
                            styles.periodButtonText,
                            { color: reviewPeriod === 'PM' ? '#fff' : theme.colors.text }
                          ]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.declineButton, { backgroundColor: theme.colors.error }]}
                onPress={handleDeclineRequest}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveButton, { backgroundColor: theme.colors.success }]}
                onPress={handleApproveRequest}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
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
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  weekCalendar: {
    flexDirection: 'row',
    gap: 8,
  },
  dayItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  calendarButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  clearDateBtn: {
    padding: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  appointmentCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  timeSection: {
    marginRight: 16,
    paddingRight: 16,
    borderRightWidth: 2,
    borderRightColor: '#e5e5e5',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vaccineText: {
    fontSize: 13,
    marginBottom: 12,
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
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
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
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
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
    borderTopColor: '#e5e5e5',
  },
  pickerContainer: {
    gap: 8,
    marginBottom: 8,
  },
  patientOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedDateText: {
    fontSize: 15,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inlineCalendar: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  calendarMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 8,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  calendarDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  inlineCalendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContainer: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  calendarCloseButton: {
    padding: 8,
  },
  calendarModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
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
  periodSelector: {
    marginTop: 8,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginVertical: 4,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  deleteHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  deleteHistoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  historyDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyHistoryState: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sectionHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestPatientName: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestReason: {
    fontSize: 14,
    marginBottom: 6,
  },
  requestDate: {
    fontSize: 13,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  declineBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    width: '100%',
  },
  infoSection: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoSubvalue: {
    fontSize: 13,
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginRight: 12,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  simpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  cardContent: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  appointmentPatient: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyPatient: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  historyDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDate: {
    fontSize: 13,
  },
  summaryContainer: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  secondaryActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  warningActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  requestCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateModal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  appointmentCardSimple: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardRelationship: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardFamilyInfo: {
    fontSize: 12,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    maxHeight: 60,
  },
  filterTabsContent: {
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    borderWidth: 0,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
});