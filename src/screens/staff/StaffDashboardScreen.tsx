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
import { useStaffPatients } from '../../context/staff-patients-context';
import { useAppointments } from '../../context/appointments-context';
import { useNotifications } from '../../context/notifications-context';
import { FamilyMember } from '../../lib/data';
import { format } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function StaffDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { staffPatients } = useStaffPatients();
  // Use staffPatients as familyMembers for compatibility
  const familyMembers = staffPatients;
  const { appointments } = useAppointments();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'up-to-date' | 'needs-update'>('all');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showFullyVaccinatedModal, setShowFullyVaccinatedModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Get pending checkup requests for this staff member
  const pendingCheckupRequests = React.useMemo(() => {
    return appointments.filter(
      apt => apt.appointmentType === 'checkup' && 
             apt.status === 'pending' && 
             apt.staffId === user?.id
    ).slice(0, 5);
  }, [appointments, user?.id]);

  // Get all pending requests (for the modal)
  const allPendingRequests = React.useMemo(() => {
    return appointments.filter(
      apt => apt.status === 'pending' && 
             apt.staffId === user?.id
    );
  }, [appointments, user?.id]);

  // Staff should not see patient family members - they need their own patient management system
  // For now, show empty state since there's no patient assignment system yet
  const families = React.useMemo(() => {
    // Return empty array - staff accounts don't have family members
    // In the future, this should load patients assigned to this staff member
    return [];
    
    // Old code (kept for reference when implementing patient assignment):
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
  const pendingVaccinations = allPendingRequests.length;

  // Get today's appointments
  const todayAppointments = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments.filter(apt => 
      apt.date === today && 
      apt.status === 'scheduled' &&
      apt.staffId === user?.id
    );
  }, [appointments, user?.id]);

  // Get recent patient additions (last 7 days)
  const recentPatients = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return familyMembers
      .filter(p => p.createdAt && new Date(p.createdAt) > sevenDaysAgo)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [familyMembers]);

  // Upcoming appointments (next 7 days)
  const upcomingAppointments = React.useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate > today && 
             aptDate <= nextWeek && 
             apt.status === 'scheduled' &&
             apt.staffId === user?.id;
    }).sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateA.getTime() - dateB.getTime();
    }).slice(0, 5);
  }, [appointments, user?.id]);

  // This week's appointment statistics
  const weekStats = React.useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const thisWeekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= startOfWeek && aptDate <= endOfWeek && apt.staffId === user?.id;
    });

    return {
      total: thisWeekAppointments.length,
      completed: thisWeekAppointments.filter(a => a.status === 'completed').length,
      scheduled: thisWeekAppointments.filter(a => a.status === 'scheduled').length,
    };
  }, [appointments, user?.id]);

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
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeCount}>{unreadCount}</Text>
                </View>
              )}
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



        {/* Pending Checkup Requests */}
        {pendingCheckupRequests.length > 0 && (
          <View style={[styles.section, { marginBottom: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Checkup Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {pendingCheckupRequests.map((apt) => (
              <TouchableOpacity
                key={apt.id}
                style={[styles.checkupRequestCard, { backgroundColor: theme.colors.warning + '15', borderLeftColor: theme.colors.warning }]}
                onPress={() => navigation.navigate('Appointments')}
              >
                <Ionicons name="time-outline" size={18} color={theme.colors.warning} style={{ marginRight: 12 }} />
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestTitle, { color: theme.colors.text }]}>{apt.patientName}</Text>
                  <Text style={[styles.requestReason, { color: theme.colors.textSecondary }]}>{apt.reasonForCheckup}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* This Week's Overview */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>This Week's Overview</Text>
          <View style={styles.weekOverviewGrid}>
            <View style={[styles.weekStatCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.weekStatNumber, { color: theme.colors.primary }]}>{weekStats.total}</Text>
              <Text style={[styles.weekStatLabel, { color: theme.colors.textSecondary }]}>Total</Text>
            </View>
            <View style={[styles.weekStatCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.weekStatNumber, { color: theme.colors.success }]}>{weekStats.completed}</Text>
              <Text style={[styles.weekStatLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
            </View>
            <View style={[styles.weekStatCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.weekStatNumber, { color: theme.colors.warning }]}>{weekStats.scheduled}</Text>
              <Text style={[styles.weekStatLabel, { color: theme.colors.textSecondary }]}>Scheduled</Text>
            </View>
          </View>
        </View>

        {/* Today's Appointments */}
        {todayAppointments.length > 0 && (
          <View style={[styles.section, { marginBottom: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Schedule</Text>
              <Text style={[styles.countBadge, { color: theme.colors.primary, backgroundColor: theme.colors.primary + '20' }]}>
                {todayAppointments.length}
              </Text>
            </View>
            {todayAppointments.slice(0, 3).map((apt) => (
              <TouchableOpacity
                key={apt.id}
                style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('Appointments')}
              >
                <View style={styles.appointmentTime}>
                  <Ionicons name="time" size={16} color={theme.colors.primary} />
                  <Text style={[styles.timeText, { color: theme.colors.primary }]}>{apt.time}</Text>
                </View>
                <Text style={[styles.appointmentPatient, { color: theme.colors.text }]}>{apt.patientName}</Text>
                <Text style={[styles.appointmentType, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {apt.reasonForCheckup || apt.appointmentType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Appointments (Next 7 Days) */}
        {upcomingAppointments.length > 0 && (
          <View style={[styles.section, { marginBottom: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming This Week</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.upcomingContainer}>
              {upcomingAppointments.map((apt) => (
                <TouchableOpacity
                  key={apt.id}
                  style={[styles.upcomingCard, { backgroundColor: theme.colors.card, borderLeftColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('Appointments')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dateBox, { backgroundColor: '#e0e7ff' }]}>
                    <Text style={[styles.dateDay, { color: '#6366f1' }]}>
                      {format(new Date(apt.date), 'd')}
                    </Text>
                    <Text style={[styles.dateMonth, { color: '#6366f1' }]}>
                      {format(new Date(apt.date), 'MMM').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={[styles.upcomingPatient, { color: theme.colors.text }]}>{apt.patientName}</Text>
                    <View style={styles.upcomingMeta}>
                      <Ionicons name="time" size={14} color="#10b981" />
                      <Text style={[styles.upcomingTime, { color: theme.colors.textSecondary }]}>{apt.time}</Text>
                      {apt.reasonForCheckup && (
                        <>
                          <Text style={[styles.metaDivider, { color: theme.colors.textTertiary }]}>•</Text>
                          <Text style={[styles.upcomingReason, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {apt.reasonForCheckup}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recently Added Patients */}
        {recentPatients.length > 0 && (
          <View style={[styles.section, { marginBottom: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recently Added</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textTertiary }]}>Last 7 days</Text>
            </View>
            {recentPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[styles.recentPatientCard, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('PatientManagement')}
              >
                <Image source={{ uri: patient.avatarUrl }} style={styles.smallAvatar} />
                <View style={styles.recentPatientInfo}>
                  <Text style={[styles.recentPatientName, { color: theme.colors.text }]}>{patient.name}</Text>
                  <Text style={[styles.recentPatientDate, { color: theme.colors.textTertiary }]}>
                    {patient.createdAt && format(new Date(patient.createdAt), 'MMM d, yyyy')}
                  </Text>
                </View>
                <View style={[styles.newBadge, { backgroundColor: theme.colors.success + '20' }]}>
                  <Text style={[styles.newBadgeText, { color: theme.colors.success }]}>New</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activity (empty state when no data) */}
        {pendingCheckupRequests.length === 0 && todayAppointments.length === 0 && 
         upcomingAppointments.length === 0 && recentPatients.length === 0 && (
          <View style={[styles.section, { marginBottom: 32 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            </View>
            
            <View style={styles.emptyActivitiesContainer}>
              <Ionicons name="pulse-outline" size={48} color={theme.colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyActivitiesText, { color: theme.colors.textSecondary }]}>
                No recent activities
              </Text>
              <Text style={[styles.emptyActivitiesSubtext, { color: theme.colors.textTertiary }]}>
                Patient activities will appear here
              </Text>
            </View>
          </View>
        )}
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

      {/* Pending Requests Modal */}
      <Modal
        visible={showPendingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Pending Requests</Text>
            <TouchableOpacity 
              onPress={() => setShowPendingModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={allPendingRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.patientList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.patientCard, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                  setShowPendingModal(false);
                  navigation.navigate('Appointments');
                }}
              >
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: theme.colors.text }]}>{item.patientName}</Text>
                  <Text style={[styles.patientEmail, { color: theme.colors.textSecondary }]}>
                    {item.appointmentType === 'checkup' ? item.reasonForCheckup : item.vaccine}
                  </Text>
                  <View style={styles.appointmentInfo}>
                    <Ionicons name="calendar" size={12} color={theme.colors.warning} />
                    <Text style={[styles.appointmentText, { color: theme.colors.warning }]}>
                      Requested: {item.date ? format(new Date(item.date), 'MMM d, yyyy') : 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingIcon}>
                  <Ionicons name="time-outline" size={24} color="#b45309" />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending requests</Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>All requests have been reviewed</Text>
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
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
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
    fontWeight: '600',
  },
  emptyActivitiesSubtext: {
    fontSize: 12,
    marginTop: 4,
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
  checkupRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestReason: {
    fontSize: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appointmentPatient: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentType: {
    fontSize: 13,
  },
  patientNeedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  patientNeedInfo: {
    flex: 1,
  },
  patientNeedName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  patientNeedStatus: {
    fontSize: 12,
  },
  recentPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentPatientInfo: {
    flex: 1,
  },
  recentPatientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentPatientDate: {
    fontSize: 12,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  weekOverviewGrid: {
    gap: 12,
  },
  weekOverviewContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  weekStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  weekStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStatContent: {
    flex: 1,
  },
  weekStatNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  weekStatLabel: {
    fontSize: 11,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  upcomingContainer: {
    marginTop: 12,
    gap: 10,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingPatient: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: 13,
    marginHorizontal: 4,
  },
  upcomingReason: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  upcomingDateSection: {
    marginBottom: 16,
  },
});
