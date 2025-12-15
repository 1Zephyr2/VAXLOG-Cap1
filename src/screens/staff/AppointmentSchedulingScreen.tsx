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
import { useStaffPatients } from '../../context/staff-patients-context';
import { useAppointments } from '../../context/appointments-context';
import { format, addDays, startOfWeek, getDaysInMonth, getDay, startOfMonth, endOfMonth } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function AppointmentSchedulingScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { staffPatients, updateStaffPatient } = useStaffPatients();
  // Use staffPatients as familyMembers for compatibility
  const familyMembers = staffPatients;
  const { appointments, addAppointment, cancelAppointment, completeAppointment } = useAppointments();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date()), i);
    return {
      date,
      day: format(date, 'EEE'),
      num: format(date, 'd'),
    };
  });

  const todayAppointments = appointments.filter(
    apt => apt.date === format(selectedDate, 'yyyy-MM-dd')
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
    
    // Format time in 24-hour format
    const formattedTime = `${selectedHour}:${selectedMinute}`;
    
    // Create new appointment (without id - Firebase will generate it)
    const newAppointment = {
      patientId: patient.id,
      patientName: selectedPatient,
      vaccine: selectedVaccine,
      time: formattedTime,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'scheduled' as const,
    };

    try {
      // Add appointment to Firestore
      await addAppointment(newAppointment);
    
      // Add vaccine to patient's vaccine history as "Upcoming"
      const updatedVaccineHistory = [
        ...patient.vaccineHistory,
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
      
      Alert.alert('Success', `Appointment booked for ${selectedPatient}\n${selectedVaccine} at ${formattedTime}\n${format(selectedDate, 'MMMM d, yyyy')}`);
      setShowBookingModal(false);
      setSelectedPatient('');
      setSelectedVaccine('');
      setSelectedHour('08');
      setSelectedMinute('00');
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
      `Cancel ${appointment.patientName}'s ${appointment.vaccine} at ${appointment.time}?`,
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Appointments</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleBookAppointment}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Book</Text>
            </TouchableOpacity>
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
                  {dayAppointments.length > 0 && (
                    <View style={styles.calendarGridIndicator}>
                      <Text style={[styles.calendarGridDot, { color: isSelected ? '#fff' : theme.colors.primary }]}>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{appointments.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total This Week</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="time-outline" size={24} color={theme.colors.success} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{todayAppointments.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Today</Text>
          </View>
        </View>

        {/* Appointments List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {format(selectedDate, 'MMMM d, yyyy')}
        </Text>


        {todayAppointments.length > 0 ? (
          todayAppointments.map((appointment) => (
            <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.timeSection}>
                <Text style={[styles.timeText, { color: theme.colors.primary }]}>{appointment.time}</Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={[styles.patientName, { color: theme.colors.text }]}>{appointment.patientName}</Text>
                <Text style={[styles.vaccineText, { color: theme.colors.textSecondary }]}>
                  <Ionicons name="medical-outline" size={14} /> {appointment.vaccine}
                </Text>
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
                    onPress={() => Alert.alert('Reschedule', 'Select new date and time')}
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
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No appointments scheduled
            </Text>
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleBookAppointment}
            >
              <Text style={styles.emptyButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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

              <Text style={[styles.label, { color: theme.colors.text }]}>Time (24-hour format)</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Hour</Text>
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedHour(prev => {
                        const hour = (parseInt(prev) - 1 + 24) % 24;
                        return hour.toString().padStart(2, '0');
                      })}
                    >
                      <Ionicons name="chevron-up" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
                      {selectedHour}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setSelectedHour(prev => {
                        const hour = (parseInt(prev) + 1) % 24;
                        return hour.toString().padStart(2, '0');
                      })}
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
                        const minute = (parseInt(prev) - 5 + 60) % 60;
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
                        const minute = (parseInt(prev) + 5) % 60;
                        return minute.toString().padStart(2, '0');
                      })}
                    >
                      <Ionicons name="chevron-down" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
              <Text style={[styles.selectedDateText, { color: theme.colors.textSecondary }]}>
                {format(selectedDate, 'MMMM d, yyyy')}
              </Text>
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  monthNavBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthName: {
    fontSize: 16,
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
  calendarGridIndicator: {
    position: 'absolute',
    bottom: 3,
    right: 3,
  },
  calendarGridDot: {
    fontSize: 14,
    fontWeight: '700',
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
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDay: {
    width: '13.5%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  appointmentDot: {
    fontSize: 16,
    fontWeight: '700',
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
});
