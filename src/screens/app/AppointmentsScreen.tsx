import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../context/auth-context';
import { useAppointments } from '../../context/appointments-context';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, parse } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function AppointmentsScreen() {
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { appointments, addAppointment, cancelAppointment, deleteAppointment } = useAppointments();

  // Always include the owner (user) in the family member selector
  const effectiveMembers = React.useMemo(() => {
    if (!user) return [];
    
    // Check if user is already in familyMembers (relationship === 'Me')
    const hasOwner = familyMembers.some(m => m.relationship === 'Me' || m.id === user.id);
    
    if (hasOwner) {
      return familyMembers;
    }
    
    // If owner not in list, add them at the beginning
    return [{
      id: user.id,
      name: user.name || 'Me',
      email: user.email,
      relationship: 'Me',
      avatarUrl: '',
      age: 0,
      birthdate: '',
      gender: 'Other' as const,
      phone: '',
      isFullyVaccinated: false,
      nextDose: null,
      vaccineHistory: []
    }, ...familyMembers];
  }, [familyMembers, user]);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    effectiveMembers.length > 0 ? effectiveMembers[0].id : null
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCheckupReason, setSelectedCheckupReason] = useState('');
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [staffList, setStaffList] = useState<Array<{id: string; name: string; email: string}>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const selectedMember = effectiveMembers.find((m) => m.id === selectedMemberId);

  // Load staff members on mount
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'staff'));
        const querySnapshot = await getDocs(q);
        const staff: Array<{id: string; name: string; email: string}> = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          staff.push({
            id: doc.id,
            name: data.name || 'Staff Member',
            email: data.email || '',
          });
        });
        setStaffList(staff);
        if (staff.length > 0) {
          setSelectedStaffId(staff[0].id);
        }
      } catch (error) {
        console.error('Error loading staff:', error);
      }
    };
    loadStaff();
  }, []);

  const memberAppointments = useMemo(() => {
    if (!selectedMember) return [];
    return appointments.filter(
      (apt) => apt.patientId === selectedMember.id
    );
  }, [selectedMember, appointments]);

  const pending = memberAppointments.filter((apt) => apt.status === 'pending');
  const scheduled = memberAppointments.filter((apt) => apt.status === 'scheduled');
  const completed = memberAppointments.filter((apt) => apt.status === 'completed');
  const cancelled = memberAppointments.filter((apt) => apt.status === 'cancelled');

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleBookCheckup = async () => {
    if (!selectedCheckupReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for checkup');
      return;
    }

    if (!selectedMember) {
      Alert.alert('Error', 'Please select a family member');
      return;
    }

    if (!selectedStaffId) {
      Alert.alert('Validation Error', 'Please select a doctor');
      return;
    }

    // Convert 12-hour format to 24-hour format
    let hour24 = parseInt(selectedHour);
    if (selectedPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (selectedPeriod === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const time24 = `${hour24.toString().padStart(2, '0')}:${selectedMinute}`;

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    const newAppointment: any = {
      patientId: selectedMember.id,
      patientName: selectedMember.name,
      appointmentType: 'checkup',
      reasonForCheckup: selectedCheckupReason,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: time24,
      status: 'pending',
      bookedByStaff: false,
      userId: user?.id,
      staffId: selectedStaffId,
      staffName: selectedStaff?.name || 'Staff',
      familyOwnerName: user?.name || 'Unknown',
      familyOwnerEmail: user?.email || '',
      familyMemberRelationship: selectedMember.relationship || 'Unknown',
    };

    try {
      await addAppointment(newAppointment);
      
      // Create notification for the selected staff
      await addDoc(collection(db, 'notifications'), {
        userId: selectedStaffId,
        memberName: selectedMember.name,
        message: `New checkup request: ${selectedCheckupReason}`,
        date: new Date().toISOString(),
        type: 'Reminder',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert(
        'Success',
        `Checkup request submitted to ${selectedStaff?.name} for ${selectedMember.name} on ${format(selectedDate, 'MMM d, yyyy')} at ${selectedHour}:${selectedMinute} ${selectedPeriod}.\n${selectedStaff?.name} will review your request.`
      );
      setSelectedCheckupReason('');
      setSelectedDate(new Date());
      setSelectedHour('08');
      setSelectedMinute('00');
      setSelectedPeriod('AM');
      setShowBookingModal(false);
    } catch (error) {
      console.error('Error booking checkup:', error);
      Alert.alert('Error', 'Failed to submit checkup request. Please try again.');
    }
  };

  const handleCancelPending = (appointmentId: string) => {
    Alert.alert(
      'Cancel Checkup Request',
      'Are you sure you want to cancel this checkup request?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await cancelAppointment(appointmentId);
              Alert.alert('Success', 'Checkup request cancelled');
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel checkup request');
            }
          },
        },
      ]
    );
  };

  const handleCancelScheduled = (appointment: any) => {
    Alert.alert(
      'Cancel Appointment',
      `Cancel this checkup appointment?`,
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
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        },
      ]
    );
  };

  const handleDeleteCompletedHistory = () => {
    Alert.alert(
      'Delete Completed History',
      `Delete all ${completed.length} completed appointments? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const apt of completed) {
                await deleteAppointment(apt.id);
              }
              Alert.alert('Success', 'Completed appointments deleted');
            } catch (error) {
              console.error('Error deleting completed appointments:', error);
              Alert.alert('Error', 'Failed to delete completed appointments');
            }
          }
        },
      ]
    );
  };

  const handleDeleteCancelledHistory = () => {
    Alert.alert(
      'Delete Cancelled History',
      `Delete all ${cancelled.length} cancelled appointments? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const apt of cancelled) {
                await deleteAppointment(apt.id);
              }
              Alert.alert('Success', 'Cancelled appointments deleted');
            } catch (error) {
              console.error('Error deleting cancelled appointments:', error);
              Alert.alert('Error', 'Failed to delete cancelled appointments');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Appointments</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Family Member Tabs */}
        {effectiveMembers.length > 1 && (
          <View style={[styles.membersContainer, { backgroundColor: theme.colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {effectiveMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberTab,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  selectedMemberId === member.id && { borderColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedMemberId(member.id)}
              >
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.memberName,
                    { color: theme.colors.textSecondary },
                    selectedMemberId === member.id && { color: theme.colors.primary, fontWeight: '700' },
                  ]}
                >
                  {member.name}
                </Text>
              </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedMember && (
          <>
            {/* Stats Cards */}
            <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.statNumber, { color: theme.colors.warning }]}>{pending.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.statNumber, { color: theme.colors.success }]}>{scheduled.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Scheduled</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{completed.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.statNumber, { color: theme.colors.error }]}>{cancelled.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Cancelled</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowBookingModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.bookButtonText}>Request Checkup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.historyButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.primary }]}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.historyButtonText, { color: theme.colors.primary }]}>Appointment History</Text>
              </TouchableOpacity>
            </View>

            {/* Pending Requests Section */}
            {pending.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Requests</Text>
                {pending.map((appointment) => (
                  <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardContent}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: theme.colors.warning + '20' }
                          ]}
                        >
                          <Text style={[styles.statusText, { color: theme.colors.warning }]}>Pending</Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                          ]}
                        >
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
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup || 'No reason specified'}
                      </Text>
                      <Text style={[styles.appointmentDate, { color: theme.colors.textSecondary }]}>
                        Requested on {appointment.date ? format(new Date(appointment.date), 'MMM d, yyyy') : 'No date'}
                      </Text>
                    </View>
                    <View style={styles.appointmentActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => handleCancelPending(appointment.id)}
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Scheduled Appointments Section */}
            {scheduled.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Scheduled Appointments</Text>
                {scheduled.map((appointment) => (
                  <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardContent}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: theme.colors.success + '20' }
                          ]}
                        >
                          <Text style={[styles.statusText, { color: theme.colors.success }]}>Scheduled</Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                          ]}
                        >
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
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup || 'No reason specified'}
                      </Text>
                      <Text style={[styles.appointmentDate, { color: theme.colors.textSecondary }]}>
                        <Ionicons name="calendar" size={14} /> {appointment.date ? `${format(new Date(appointment.date), 'MMMM d, yyyy')} at ${appointment.time}` : 'No date scheduled'}
                      </Text>
                    </View>
                    <View style={styles.appointmentActions}>
                      <TouchableOpacity
                        style={[styles.cancelOnlyBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => handleCancelScheduled(appointment)}
                      >
                        <Ionicons name="close-circle" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Cancel Appointment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}



            {pending.length === 0 && scheduled.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No pending or scheduled appointments
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  Request a checkup to get started. Vaccinations are scheduled by staff.
                </Text>
              </View>
            )}
          </>
        )}

        {!selectedMember && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Unable to load user information
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              Please try logging out and back in
            </Text>
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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Request Checkup</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Reason for Checkup</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                placeholder="e.g., General physical, Follow-up, Pain check"
                placeholderTextColor={theme.colors.textTertiary}
                value={selectedCheckupReason}
                onChangeText={setSelectedCheckupReason}
                multiline
                numberOfLines={3}
              />

              {/* Family Member Selector */}
              {effectiveMembers.length > 0 && (
                <>
                  <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Select Family Member</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyMemberScrollView}>
                    {effectiveMembers.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.familyMemberCard,
                          { 
                            backgroundColor: theme.colors.background,
                            borderColor: selectedMemberId === member.id ? theme.colors.primary : theme.colors.border,
                            borderWidth: selectedMemberId === member.id ? 2 : 1,
                          }
                        ]}
                        onPress={() => setSelectedMemberId(member.id)}
                      >
                        <View style={[
                          styles.familyMemberAvatar,
                          { backgroundColor: selectedMemberId === member.id ? theme.colors.primary : theme.colors.textTertiary }
                        ]}>
                          <Ionicons name="person" size={20} color="#fff" />
                        </View>
                        <Text style={[
                          styles.familyMemberName,
                          { color: selectedMemberId === member.id ? theme.colors.primary : theme.colors.text }
                        ]} numberOfLines={1}>
                          {member.name}
                        </Text>
                        <Text style={[
                          styles.familyMemberRelation,
                          { color: theme.colors.textTertiary }
                        ]} numberOfLines={1}>
                          {member.relationship}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Select Doctor</Text>
              <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: selectedStaffId ? theme.colors.primary : theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Type doctor's name to search..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={staffSearchQuery}
                  onChangeText={setStaffSearchQuery}
                />
                {selectedStaffId && staffSearchQuery.trim().length === 0 && (
                  <View style={styles.selectedDoctorIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  </View>
                )}
              </View>
              {staffSearchQuery.trim().length > 0 && (
                <View style={styles.doctorList}>
                  {staffList
                    .filter(staff => staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase()))
                    .length > 0 ? (
                    staffList
                      .filter(staff => staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase()))
                      .map((staff) => (
                      <TouchableOpacity
                        key={staff.id}
                        style={[
                          styles.doctorItem,
                          { 
                            backgroundColor: selectedStaffId === staff.id ? theme.colors.primary + '10' : theme.colors.background,
                            borderColor: selectedStaffId === staff.id ? theme.colors.primary : theme.colors.border,
                          }
                        ]}
                        onPress={() => {
                          setSelectedStaffId(staff.id);
                          setStaffSearchQuery(staff.name);
                        }}
                      >
                        <View style={[
                          styles.doctorAvatar,
                          { backgroundColor: selectedStaffId === staff.id ? theme.colors.primary : theme.colors.textTertiary }
                        ]}>
                          <Ionicons name="person" size={20} color="#fff" />
                        </View>
                        <View style={styles.doctorInfo}>
                          <Text style={[
                            styles.doctorName,
                            { color: selectedStaffId === staff.id ? theme.colors.primary : theme.colors.text }
                          ]}>
                            {staff.name}
                          </Text>
                          <Text style={[styles.doctorEmail, { color: theme.colors.textTertiary }]}>
                            {staff.email}
                          </Text>
                        </View>
                        {selectedStaffId === staff.id && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.noResultsContainer}>
                      <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                        No doctors found matching "{staffSearchQuery}"
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Preferred Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
                ]}
                onPress={() => setShowCalendar(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                  {format(selectedDate, 'MMMM d, yyyy')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Preferred Time</Text>
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
                      <Ionicons name="chevron-up" size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.timeDisplay, { color: theme.colors.text }]}>{selectedHour}</Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        let newHour = parseInt(selectedHour) - 1;
                        if (newHour < 1) newHour = 12;
                        setSelectedHour(newHour.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color="#fff" />
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
                        const newMinute = (parseInt(selectedMinute) + 15) % 60;
                        setSelectedMinute(newMinute.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-up" size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.timeDisplay, { color: theme.colors.text }]}>{selectedMinute}</Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        const newMinute = (parseInt(selectedMinute) - 15 + 60) % 60;
                        setSelectedMinute(newMinute.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color="#fff" />
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

              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Staff will review your preferred date and time. Vaccination schedules are set by staff.
              </Text>
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
                onPress={handleBookCheckup}
              >
                <Text style={styles.saveButtonText}>Request Checkup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Appointment History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyModalBody}>
              {/* Completed Appointments Section */}
              <View style={styles.historySection}>
                <View style={styles.sectionHeaderWithAction}>
                  <Text style={[styles.sectionTitleInHeader, { color: theme.colors.text }]}>
                    Completed Appointments
                  </Text>
                  {completed.length > 0 && (
                    <TouchableOpacity
                      style={[styles.clearHistoryBtn, { backgroundColor: theme.colors.error }]}
                      onPress={handleDeleteCompletedHistory}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                {completed.length > 0 ? (
                  completed.map((appointment) => (
                    <View key={appointment.id} style={[styles.historyCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <View style={styles.cardContent}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                            <Text style={[styles.statusText, { color: '#10B981' }]}>Completed</Text>
                          </View>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                            ]}
                          >
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
                        <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                          {appointment.reasonForCheckup || 'No reason specified'}
                        </Text>
                        <Text style={[styles.appointmentDate, { color: theme.colors.textSecondary }]}>
                          <Ionicons name="calendar" size={14} /> {appointment.date ? format(new Date(appointment.date), 'MMMM d, yyyy') : 'No date'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => {
                          Alert.alert(
                            'Delete Appointment',
                            'Delete this completed appointment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await deleteAppointment(appointment.id);
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to delete appointment');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyHistoryState, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                      No completed appointments yet
                    </Text>
                  </View>
                )}
              </View>

              {/* Cancelled Appointments Section */}
              <View style={styles.historySection}>
                <View style={styles.sectionHeaderWithAction}>
                  <Text style={[styles.sectionTitleInHeader, { color: theme.colors.text }]}>
                    Cancelled Appointments
                  </Text>
                  {cancelled.length > 0 && (
                    <TouchableOpacity
                      style={[styles.clearHistoryBtn, { backgroundColor: theme.colors.error }]}
                      onPress={handleDeleteCancelledHistory}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                {cancelled.length > 0 ? (
                  cancelled.map((appointment) => (
                    <View key={appointment.id} style={[styles.historyCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <View style={styles.cardContent}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.statusBadge, { backgroundColor: theme.colors.error + '20' }]}>
                            <Text style={[styles.statusText, { color: theme.colors.error }]}>Cancelled</Text>
                          </View>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: appointment.appointmentType === 'vaccination' ? '#10B981' + '20' : theme.colors.primary + '20' }
                            ]}
                          >
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
                        <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                          {appointment.reasonForCheckup || 'No reason specified'}
                        </Text>
                        <Text style={[styles.appointmentDate, { color: theme.colors.textSecondary }]}>
                          <Ionicons name="calendar" size={14} /> {appointment.date ? format(new Date(appointment.date), 'MMMM d, yyyy') : 'No date'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => {
                          Alert.alert(
                            'Delete Appointment',
                            'Delete this cancelled appointment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await deleteAppointment(appointment.id);
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to delete appointment');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyHistoryState, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                      No cancelled appointments yet
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={[styles.calendarModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setCurrentMonth(addDays(startOfMonth(currentMonth), -1))}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.calendarTitle, { color: theme.colors.text }]}>
                {format(currentMonth, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity onPress={() => setCurrentMonth(addDays(endOfMonth(currentMonth), 1))}>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={[styles.weekDayText, { color: theme.colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {daysInMonth.map((day, index) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isPast = day < new Date() && !isToday;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      isSelected && { backgroundColor: theme.colors.primary },
                      isToday && !isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setSelectedDate(day);
                      setShowCalendar(false);
                    }}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: theme.colors.text },
                        isSelected && { color: '#fff', fontWeight: '700' },
                        isPast && { color: theme.colors.textTertiary },
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.calendarCloseButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={[styles.calendarCloseButtonText, { color: theme.colors.text }]}>Close</Text>
            </TouchableOpacity>
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  membersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  memberTab: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
  },
  statBox: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    minHeight: 50,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 50,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleInHeader: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  clearHistoryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    flexShrink: 0,
  },
  appointmentCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    marginBottom: 12,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  appointmentReason: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    margin: 16,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyHistoryState: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  historyModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  historyModalBody: {
    paddingBottom: 16,
  },
  historySection: {
    marginTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeDisplay: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 8,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 35,
    marginHorizontal: 8,
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
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
  },
  familyMemberScrollView: {
    marginTop: 8,
    marginBottom: 8,
  },
  familyMemberCard: {
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
    maxWidth: 90,
  },
  familyMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  familyMemberName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  familyMemberRelation: {
    fontSize: 11,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  doctorList: {
    marginTop: 8,
    maxHeight: 200,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  doctorEmail: {
    fontSize: 12,
  },
  selectedDoctorIndicator: {
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  staffScrollView: {
    marginTop: 8,
    marginBottom: 8,
  },
  staffCard: {
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelOnlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  monthNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timePickerSection: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  timePickerButtons: {
    alignItems: 'center',
  },
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
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
});
