import React, { useState, useMemo } from 'react';
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
  const { appointments, addAppointment, cancelAppointment, updateAppointment, completeAppointment, deleteAppointment } = useAppointments();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    familyMembers.length > 0 ? familyMembers[0].id : null
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCheckupReason, setSelectedCheckupReason] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleHour, setRescheduleHour] = useState('08');
  const [rescheduleMinute, setRescheduleMinute] = useState('00');

  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId);

  const memberAppointments = useMemo(() => {
    if (!selectedMember) return [];
    return appointments.filter(
      (apt) => apt.patientId === selectedMember.id && apt.appointmentType === 'checkup'
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

  const handleBookCheckup = () => {
    if (!selectedCheckupReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for checkup');
      return;
    }

    if (!selectedMember) {
      Alert.alert('Error', 'Please select a family member');
      return;
    }

    const newAppointment: any = {
      patientId: selectedMember.id,
      patientName: selectedMember.name,
      appointmentType: 'checkup',
      reasonForCheckup: selectedCheckupReason,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'pending',
      bookedByStaff: false,
      userId: user?.id,
    };

    try {
      addAppointment(newAppointment);
      Alert.alert(
        'Success',
        `Checkup request submitted for ${selectedMember.name}.\nStaff will schedule a date soon.`
      );
      setSelectedCheckupReason('');
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

  const handleCompleteAppointment = (appointment: any) => {
    Alert.alert(
      'Complete Appointment',
      `Mark this checkup as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeAppointment(appointment.id);
              Alert.alert('Success', 'Appointment marked as completed');
            } catch (error) {
              console.error('Error completing appointment:', error);
              Alert.alert('Error', 'Failed to complete appointment');
            }
          }
        },
      ]
    );
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

      await updateAppointment(rescheduleAppointment.id, {
        date: newDate,
        time: newTime,
      });

      Alert.alert('Success', `Appointment rescheduled to ${format(rescheduleDate, 'MMMM d, yyyy')} at ${newTime}`);
      setShowRescheduleModal(false);
      setRescheduleAppointment(null);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment');
    }
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Checkup Appointments</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Family Member Tabs */}
        <View style={[styles.membersContainer, { backgroundColor: theme.colors.card }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {familyMembers.map((member) => (
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

            {/* Book Checkup Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowBookingModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.bookButtonText}>Request Checkup</Text>
              </TouchableOpacity>
            </View>

            {/* Pending Requests Section */}
            {pending.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Requests</Text>
                {pending.map((appointment) => (
                  <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardContent}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: theme.colors.warning + '20' }
                        ]}
                      >
                        <Text style={[styles.statusText, { color: theme.colors.warning }]}>Pending</Text>
                      </View>
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup}
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
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: theme.colors.success + '20' }
                        ]}
                      >
                        <Text style={[styles.statusText, { color: theme.colors.success }]}>Scheduled</Text>
                      </View>
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup}
                      </Text>
                      <Text style={[styles.appointmentDate, { color: theme.colors.textSecondary }]}>
                        <Ionicons name="calendar" size={14} /> {appointment.date ? `${format(new Date(appointment.date), 'MMMM d, yyyy')} at ${appointment.time}` : 'No date scheduled'}
                      </Text>
                    </View>
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
                        onPress={() => handleCancelScheduled(appointment)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Completed Appointments Section */}
            <>
              <View style={styles.sectionHeaderWithAction}>
                <Text style={[styles.sectionTitleInHeader, { color: theme.colors.text, flex: 1 }]}>Completed Appointments</Text>
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
                  <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardContent}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: '#10B98120' }
                        ]}
                      >
                        <Text style={[styles.statusText, { color: '#10B981' }]}>Completed</Text>
                      </View>
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup}
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
                <View style={[styles.emptyHistoryState, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                    No completed appointments yet
                  </Text>
                </View>
              )}
            </>
            

            {/* Cancelled Appointments Section */}
            <>
              <View style={styles.sectionHeaderWithAction}>
                <Text style={[styles.sectionTitleInHeader, { color: theme.colors.text, flex: 1 }]}>Cancelled Appointments</Text>
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
                  <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardContent}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: theme.colors.error + '20' }
                        ]}
                      >
                        <Text style={[styles.statusText, { color: theme.colors.error }]}>Cancelled</Text>
                      </View>
                      <Text style={[styles.appointmentReason, { color: theme.colors.text }]}>
                        {appointment.reasonForCheckup}
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
                <View style={[styles.emptyHistoryState, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                    No cancelled appointments yet
                  </Text>
                </View>
              )}
            </>
            

            {pending.length === 0 && scheduled.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No pending or scheduled appointments
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  Request a checkup to get started
                </Text>
              </View>
            )}
          </>
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
                numberOfLines={4}
              />

              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                A healthcare provider will review your request and schedule an appointment at a convenient time.
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
              <Text style={[styles.label, { color: theme.colors.text }]}>Select New Date</Text>
              
              {/* Month Navigation */}
              <View style={styles.monthNavBar}>
                <TouchableOpacity onPress={() => setCurrentMonth(addDays(currentMonth, -30))}>
                  <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthName, { color: theme.colors.text }]}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addDays(currentMonth, 30))}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.colors.text }]}>Select Time</Text>
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
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    gap: 12,
  },
  statBox: {
    width: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
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
    marginVertical: 8,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
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
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 85,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
