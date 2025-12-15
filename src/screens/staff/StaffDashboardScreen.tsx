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
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { useFamily } from '../../context/family-context';
import { useAppointments } from '../../context/appointments-context';
import { FamilyMember } from '../../lib/data';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function StaffDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { familyMembers } = useFamily();
  const { appointments } = useAppointments();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'up-to-date' | 'needs-update'>('all');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showFullyVaccinatedModal, setShowFullyVaccinatedModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [clearedActivities, setClearedActivities] = useState(false);

  // Group patients by family (grouping by the "Me" relationship member as family head)
  const families = React.useMemo(() => {
    // Use the same grouping logic as other screens
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

    // Convert to array format for rendering
    return Object.values(groupedFamilies).map(family => {
      const allVaccinated = family.members.every(m => m.isFullyVaccinated);
      const someNeedUpdate = family.members.some(m => !m.isFullyVaccinated);
      
      return {
        id: family.owner.id,
        name: family.owner.name.split(' ')[1] + ' Family',
        primaryContact: family.owner,
        members: family.members,
        memberCount: family.members.length,
        allVaccinated,
        someNeedUpdate,
      };
    });
  }, [familyMembers]);

  const totalPatients = familyMembers.length;
  const fullyVaccinatedPatients = familyMembers.filter(p => p.isFullyVaccinated);
  const fullyVaccinated = fullyVaccinatedPatients.length;
  const pendingPatients = familyMembers.filter(p => !p.isFullyVaccinated).map(patient => {
    // Find appointment for this patient
    const appointment = appointments.find(
      apt => apt.patientId === patient.id && apt.status === 'scheduled'
    );
    return {
      ...patient,
      appointment,
    };
  });
  const pendingVaccinations = pendingPatients.length;

  // Filter families by search and status
  const filteredFamilies = React.useMemo(() => {
    return families.filter(family => {
      // Search filter
      const matchesSearch = !searchQuery.trim() || 
        family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        family.primaryContact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        family.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'up-to-date') {
        matchesStatus = family.allVaccinated;
      } else if (filterStatus === 'needs-update') {
        matchesStatus = family.someNeedUpdate;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [families, searchQuery, filterStatus]);

  const toggleFamily = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.card} 
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.userSection}>
            <Image 
              source={{ uri: user?.avatarUrl }} 
              style={styles.avatar}
            />
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome back,</Text>
              <Text style={[styles.userName, { color: theme.colors.text }]}>{user?.name}</Text>
              <Text style={[styles.role, { color: theme.colors.primary }]}>Healthcare Professional</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.colors.iconBackground }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications" size={24} color={theme.colors.text} />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeCount}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.colors.iconBackground }]}
              onPress={() => navigation.navigate('StaffProfile')}
            >
              <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate('PatientManagement')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="people" size={28} color="#6366f1" />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{totalPatients}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Patients</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowFullyVaccinatedModal(true)}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#15803d" />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{fullyVaccinated}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Fully Vaccinated</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowPendingModal(true)}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="time" size={28} color="#b45309" />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{pendingVaccinations}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
          </TouchableOpacity>
        </View>



        {/* Recent Activity */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            {!clearedActivities && (
              <TouchableOpacity
                onPress={() => setClearedActivities(true)}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {!clearedActivities ? (
            <>
              <View style={[styles.activityCard, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, { color: theme.colors.text }]}>Vaccination Completed</Text>
                  <Text style={[styles.activityDetail, { color: theme.colors.textSecondary }]}>
                    Emma Doe - Influenza Vaccine
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.colors.textTertiary }]}>2 hours ago</Text>
                </View>
              </View>

              <View style={[styles.activityCard, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#eef2ff' }]}>
                  <Ionicons name="person-add" size={20} color="#6366f1" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, { color: theme.colors.text }]}>New Patient Registered</Text>
                  <Text style={[styles.activityDetail, { color: theme.colors.textSecondary }]}>
                    Smith Family - 3 members
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.colors.textTertiary }]}>5 hours ago</Text>
                </View>
              </View>

              <View style={[styles.activityCard, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="calendar" size={20} color="#b45309" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, { color: theme.colors.text }]}>Appointment Scheduled</Text>
                  <Text style={[styles.activityDetail, { color: theme.colors.textSecondary }]}>
                    Julian Doe - MMR Dose 2
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.colors.textTertiary }]}>1 day ago</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyActivitiesContainer}>
              <Text style={[styles.emptyActivitiesText, { color: theme.colors.textSecondary }]}>
                No recent activities
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fully Vaccinated Modal */}
      <Modal
        visible={showFullyVaccinatedModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFullyVaccinatedModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Fully Vaccinated Patients</Text>
            <TouchableOpacity 
              onPress={() => setShowFullyVaccinatedModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={fullyVaccinatedPatients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.patientList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.patientCard, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('MemberProfile', { memberId: item.id })}
              >
                <Image 
                  source={{ uri: item.avatarUrl }} 
                  style={styles.patientAvatar}
                />
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.patientEmail, { color: theme.colors.textSecondary }]}>{item.email || 'No email'}</Text>
                </View>
                <View style={styles.vaccineCheckmark}>
                  <Ionicons name="checkmark-circle" size={24} color="#15803d" />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No fully vaccinated patients</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Pending Vaccinations Modal */}
      <Modal
        visible={showPendingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Pending Vaccinations</Text>
            <TouchableOpacity 
              onPress={() => setShowPendingModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={pendingPatients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.patientList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.patientCard, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('MemberProfile', { memberId: item.id })}
              >
                <Image 
                  source={{ uri: item.avatarUrl }} 
                  style={styles.patientAvatar}
                />
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.patientEmail, { color: theme.colors.textSecondary }]}>{item.email || 'No email'}</Text>
                  {item.nextDose && (
                    <Text style={[styles.patientDose, { color: theme.colors.textSecondary }]}>Next: {item.nextDose.vaccine} - {item.nextDose.date}</Text>
                  )}
                  {item.appointment && (
                    <View style={styles.appointmentInfo}>
                      <Ionicons name="calendar" size={12} color={theme.colors.primary} />
                      <Text style={[styles.appointmentText, { color: theme.colors.primary }]}>
                        Appointment: {item.appointment.date} at {item.appointment.time}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.pendingIcon}>
                  <Ionicons name="time-outline" size={24} color="#b45309" />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending vaccinations</Text>
              </View>
            }
          />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  greeting: {
    fontSize: 13,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  patientCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 12,
  },
  patientStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  statusBadgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextOrange: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  patientDetail: {
    fontSize: 13,
    marginBottom: 4,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nextDoseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 13,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActivitiesContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  patientList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 13,
  },
  patientDose: {
    fontSize: 12,
    marginTop: 2,
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  appointmentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  vaccineCheckmark: {
    marginLeft: 8,
  },
  pendingIcon: {
    marginLeft: 8,
  },
});
