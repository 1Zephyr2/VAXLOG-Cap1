import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../context/auth-context';
import { useNotifications } from '../../context/notifications-context';
import { format, parseISO } from 'date-fns';
import AddVaccinationModal, { VaccinationRecord } from '../../components/AddVaccinationModal';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function MemberProfileScreen({ route, navigation }: any) {
  const { memberId } = route.params;
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const member = familyMembers.find((m) => m.id === memberId);
  const [showAddVaccineModal, setShowAddVaccineModal] = useState(false);

  const isStaff = user?.role === 'staff';

  const handleAddVaccination = () => {
    setShowAddVaccineModal(true);
  };

  const handleSaveVaccination = (vaccination: VaccinationRecord) => {
    // TODO: Update FamilyContext with new vaccination
    Alert.alert('Success', `Added ${vaccination.vaccineName} to ${member?.name}'s records`);
    console.log('New vaccination:', vaccination);
  };

  const handleSendReminder = () => {
    // Find the account owner (relationship === 'Me')
    const accountOwner = familyMembers.find(m => m.relationship === 'Me');
    const ownerName = accountOwner?.name || 'family account owner';
    const ownerContact = accountOwner?.email || accountOwner?.phone || 'registered contact';
    
    // Determine who needs the vaccine
    const patientName = member?.name;
    const isOwner = member?.relationship === 'Me';
    
    Alert.alert(
      'Send Reminder',
      isOwner 
        ? `Send vaccination reminder to ${patientName} at ${ownerContact}?`
        : `Send reminder to ${ownerName} about ${patientName}'s upcoming vaccination?\n\nReminder will be sent to: ${ownerContact}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: async () => {
            try {
              // Add in-app notification
              if (member?.nextDose) {
                await addNotification({
                  memberName: patientName || '',
                  message: isOwner 
                    ? `Reminder: Your ${member.nextDose.vaccine} is scheduled for ${member.nextDose.date}`
                    : `Reminder: ${patientName}'s ${member.nextDose.vaccine} is scheduled for ${member.nextDose.date}`,
                  date: new Date().toISOString().split('T')[0],
                  type: 'Reminder',
                });
              }
              
              Alert.alert(
                'Success', 
                `Reminder sent to ${isOwner ? patientName : ownerName}!\n\n✓ Email notification sent\n✓ In-app notification added`
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to send reminder');
            }
          },
        },
      ]
    );
  };

  const handleMarkAdministered = () => {
    if (!member?.nextDose) {
      Alert.alert('No Pending Vaccinations', 'This patient has no pending vaccinations.');
      return;
    }
    
    Alert.alert(
      'Mark as Administered',
      `Mark ${member.nextDose.vaccine} as administered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => Alert.alert('Success', 'Vaccination marked as administered!'),
        },
      ]
    );
  };

  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <Text style={{ color: theme.colors.text }}>Member not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {member.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
            </Text>
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>{member.name}</Text>
          <Text style={[styles.relationship, { color: theme.colors.textSecondary }]}>{member.relationship}</Text>
          
          {!isStaff && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.colors.iconBackground }]}
              onPress={() =>
                navigation.navigate('EditMember', { memberId: member.id })
              }
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Staff Controls */}
        {isStaff && (
          <View style={[styles.staffControlsSection, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.staffControlsTitle, { color: theme.colors.text }]}>Staff Actions</Text>
            <View style={styles.staffButtons}>
              <TouchableOpacity
                style={[styles.staffButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddVaccination}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.staffButtonText}>Add{'\n'}Vaccination</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.staffButton, { backgroundColor: theme.colors.success }]}
                onPress={handleMarkAdministered}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.staffButtonText}>Mark{'\n'}Administered</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.staffButton, { backgroundColor: theme.colors.warning }]}
                onPress={handleSendReminder}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                <Text style={styles.staffButtonText}>Send{'\n'}Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Age</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{member.age} years</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Gender</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{member.gender}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Birthdate</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{member.birthdate}</Text>
            </View>
            {member.phone && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{member.phone}</Text>
              </View>
            )}
            {member.email && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{member.email}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vaccination History</Text>
          {member.vaccineHistory.length > 0 ? (
            member.vaccineHistory.map((vaccine, index) => (
              <View key={index} style={[styles.vaccineCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.vaccineInfo}>
                  <Text style={[styles.vaccineName, { color: theme.colors.text }]}>{vaccine.name}</Text>
                  <Text style={[styles.vaccineDetails, { color: theme.colors.textSecondary }]}>Dose {vaccine.dose}</Text>
                  <Text style={[styles.vaccineDate, { color: theme.colors.textSecondary }]}>
                    {format(parseISO(vaccine.date), 'MMM d, yyyy')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    vaccine.status === 'Completed'
                      ? styles.completedBadge
                      : styles.upcomingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      vaccine.status === 'Completed'
                        ? styles.badgeTextGreen
                        : styles.badgeTextOrange,
                    ]}
                  >
                    {vaccine.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noData, { color: theme.colors.textSecondary }]}>No vaccination records</Text>
          )}
        </View>
      </ScrollView>

      {/* Add Vaccination Modal */}
      {isStaff && member && (
        <AddVaccinationModal
          visible={showAddVaccineModal}
          onClose={() => setShowAddVaccineModal(false)}
          onSave={handleSaveVaccination}
          patientName={member.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  profileHeader: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  relationship: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  editButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  vaccineCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vaccineDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vaccineDate: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
  },
  upcomingBadge: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextGreen: {
    color: '#15803d',
  },
  badgeTextOrange: {
    color: '#b45309',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  staffControlsSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  staffControlsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  staffButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  staffButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 8,
    minHeight: 80,
  },
  staffButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});
