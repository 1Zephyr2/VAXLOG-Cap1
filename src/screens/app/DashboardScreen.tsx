import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { format, parseISO } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function DashboardScreen({ navigation }: any) {
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const mainUser = familyMembers.find((m) => m.relationship === 'Me');
  const [showDoseModal, setShowDoseModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [clearedActivities, setClearedActivities] = useState(false);

  const nextDoseMember = [...familyMembers]
    .filter((m) => m.nextDose)
    .sort(
      (a, b) =>
        new Date(a.nextDose!.date).getTime() -
        new Date(b.nextDose!.date).getTime()
    )[0];

  const upcomingAppointments = useMemo(() => {
    return familyMembers
      .flatMap((member) =>
        member.vaccineHistory
          .filter((v) => v.status === 'Upcoming')
          .map((v) => ({
            ...v,
            memberName: member.name,
            memberId: member.id,
          }))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [familyMembers]);

  const completedVaccines = useMemo(() => {
    return familyMembers.reduce((total, member) => {
      return total + member.vaccineHistory.filter(v => v.status === 'Completed').length;
    }, 0);
  }, [familyMembers]);

  const allCompletedVaccines = useMemo(() => {
    return familyMembers
      .flatMap((member) =>
        member.vaccineHistory
          .filter((v) => v.status === 'Completed')
          .map((v) => ({
            ...v,
            memberName: member.name,
            memberId: member.id,
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [familyMembers]);

  const allUpcomingVaccines = useMemo(() => {
    return familyMembers
      .flatMap((member) =>
        member.vaccineHistory
          .filter((v) => v.status === 'Upcoming')
          .map((v) => ({
            ...v,
            memberName: member.name,
            memberId: member.id,
          }))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [familyMembers]);

  const recentActivities = useMemo(() => {
    if (clearedActivities) return [];
    const activities: any[] = [];
    
    familyMembers.forEach((member) => {
      // Add completed vaccine activities
      member.vaccineHistory
        .filter(v => v.status === 'Completed')
        .forEach(vaccine => {
          activities.push({
            id: `${member.id}-completed-${vaccine.date}`,
            type: 'completed',
            icon: 'checkmark-circle',
            title: `${vaccine.name} Completed`,
            subtitle: `${member.name} received ${vaccine.name}`,
            date: vaccine.date,
            memberName: member.name,
            memberAvatar: member.avatarUrl,
          });
        });
      
      // Add upcoming vaccine activities
      member.vaccineHistory
        .filter(v => v.status === 'Upcoming')
        .forEach(vaccine => {
          activities.push({
            id: `${member.id}-upcoming-${vaccine.date}`,
            type: 'upcoming',
            icon: 'calendar',
            title: `${vaccine.name} Scheduled`,
            subtitle: `${member.name} has an appointment`,
            date: vaccine.date,
            memberName: member.name,
            memberAvatar: member.avatarUrl,
          });
        });
    });

    // Sort by date (most recent first) and limit to 8
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [familyMembers, clearedActivities]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.colors.statusBar} backgroundColor={theme.colors.card} />
      
      {/* Social Media Style Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.userSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => mainUser && navigation.navigate('MemberProfile', { memberId: mainUser.id })}
          >
            <Image 
              source={{ uri: mainUser?.avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>Hi, {mainUser?.name || 'User'}!</Text>
            <Text style={[styles.userSubtext, { color: theme.colors.textSecondary }]}>Stay healthy & protected</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.colors.iconBackground }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            {upcomingAppointments.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeCount}>{upcomingAppointments.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.colors.iconBackground }]}
            onPress={() => mainUser && navigation.navigate('MemberProfile', { memberId: mainUser.id })}
          >
            <Ionicons name="person-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowCompletedModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{completedVaccines}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowUpcomingModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <Ionicons name="calendar" size={24} color={theme.colors.warning} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{upcomingAppointments.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate('Family')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{familyMembers.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Members</Text>
          </TouchableOpacity>
        </View>

        {/* Next Dose Card */}
        {nextDoseMember && nextDoseMember.nextDose && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Next Dose Due</Text>
            <TouchableOpacity 
              style={styles.nextDoseCard}
              onPress={() => setShowDoseModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.nextDoseIcon}>
                <Ionicons name="medical" size={28} color="white" />
              </View>
              <View style={styles.nextDoseContent}>
                <Text style={styles.nextDoseVaccine}>{nextDoseMember.nextDose.vaccine}</Text>
                <Text style={styles.nextDoseMember}>{nextDoseMember.name}</Text>
                <View style={styles.nextDoseDateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.nextDoseDate}>
                    {format(parseISO(nextDoseMember.nextDose.date), 'EEEE, MMMM d, yyyy')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activities</Text>
            {recentActivities.length > 0 && (
              <TouchableOpacity
                onPress={() => setClearedActivities(true)}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {recentActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {recentActivities.map((activity) => (
                <View key={activity.id} style={[styles.activityCard, { backgroundColor: theme.colors.card, borderLeftColor: activity.type === 'completed' ? theme.colors.success : theme.colors.primary }]}>
                  <View style={[styles.activityIconContainer, { backgroundColor: activity.type === 'completed' ? theme.colors.success : theme.colors.primary }]}>
                    <Ionicons name={activity.icon as any} size={18} color="white" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{activity.title}</Text>
                    <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>{activity.subtitle}</Text>
                    <Text style={[styles.activityDate, { color: theme.colors.textTertiary }]}>
                      {format(parseISO(activity.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivitiesContainer}>
              <Text style={[styles.emptyActivitiesText, { color: theme.colors.textSecondary }]}>
                No recent activities
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Recent Activities Section */}
      <Modal
        visible={false}
        transparent={true}
        animationType="none"
      >
        <View />
      </Modal>

      {/* Dose Details Modal */}
      <Modal
        visible={showDoseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDoseModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDoseModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Upcoming Dose Details</Text>
              <TouchableOpacity onPress={() => setShowDoseModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {nextDoseMember && nextDoseMember.nextDose && (
              <View style={styles.modalBody}>
                {/* Member Info */}
                <View style={[styles.modalMemberSection, { borderBottomColor: theme.colors.border }]}>
                  <Image 
                    source={{ uri: nextDoseMember.avatarUrl }} 
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalMemberInfo}>
                    <Text style={[styles.modalMemberName, { color: theme.colors.text }]}>{nextDoseMember.name}</Text>
                    <Text style={[styles.modalMemberDetails, { color: theme.colors.textSecondary }]}>
                      {nextDoseMember.relationship} • {nextDoseMember.age} years old
                    </Text>
                  </View>
                </View>

                {/* Dose Information */}
                <View style={styles.modalSection}>
                  <View style={styles.modalInfoRow}>
                    <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                      <Ionicons name="medical" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Vaccine</Text>
                      <Text style={[styles.modalValue, { color: theme.colors.text }]}>{nextDoseMember.nextDose.vaccine}</Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                      <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Scheduled Date</Text>
                      <Text style={[styles.modalValue, { color: theme.colors.text }]}>
                        {format(parseISO(nextDoseMember.nextDose.date), 'EEEE, MMMM d, yyyy')}
                      </Text>
                      <Text style={[styles.modalSubValue, { color: theme.colors.textSecondary }]}>
                        {format(parseISO(nextDoseMember.nextDose.date), 'h:mm a')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                      <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                      <View style={styles.modalStatusBadge}>
                        <Ionicons name="time" size={16} color="#f59e0b" />
                        <Text style={styles.modalStatusText}>Upcoming</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: theme.colors.iconBackground }]}
                    onPress={() => {
                      setShowDoseModal(false);
                      navigation.navigate('MemberProfile', { memberId: nextDoseMember.id });
                    }}
                  >
                    <Ionicons name="person" size={20} color={theme.colors.primary} />
                    <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>View Full Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        visible={selectedAppointment !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAppointment(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAppointment(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setSelectedAppointment(null)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (() => {
              const member = familyMembers.find(m => m.id === selectedAppointment.memberId);
              return member ? (
                <View style={styles.modalBody}>
                  {/* Member Info */}
                  <View style={[styles.modalMemberSection, { borderBottomColor: theme.colors.border }]}>
                    <Image 
                      source={{ uri: member.avatarUrl }} 
                      style={styles.modalAvatar}
                    />
                    <View style={styles.modalMemberInfo}>
                      <Text style={[styles.modalMemberName, { color: theme.colors.text }]}>{member.name}</Text>
                      <Text style={[styles.modalMemberDetails, { color: theme.colors.textSecondary }]}>
                        {member.relationship} • {member.age} years old
                      </Text>
                    </View>
                  </View>

                  {/* Appointment Information */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalInfoRow}>
                      <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                        <Ionicons name="medical" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.modalInfoText}>
                        <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Vaccine</Text>
                        <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedAppointment.name}</Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                        <Ionicons name="water" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.modalInfoText}>
                        <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Dose</Text>
                        <Text style={[styles.modalValue, { color: theme.colors.text }]}>Dose {selectedAppointment.dose}</Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                        <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.modalInfoText}>
                        <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Scheduled Date</Text>
                        <Text style={[styles.modalValue, { color: theme.colors.text }]}>
                          {format(parseISO(selectedAppointment.date), 'EEEE, MMMM d, yyyy')}
                        </Text>
                        <Text style={[styles.modalSubValue, { color: theme.colors.textSecondary }]}>
                          {format(parseISO(selectedAppointment.date), 'h:mm a')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.modalInfoText}>
                        <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                        <View style={styles.modalStatusBadge}>
                          <Ionicons name="time" size={16} color="#f59e0b" />
                          <Text style={styles.modalStatusText}>{selectedAppointment.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: theme.colors.iconBackground }]}
                      onPress={() => {
                        setSelectedAppointment(null);
                        navigation.navigate('MemberProfile', { memberId: member.id });
                      }}
                    >
                      <Ionicons name="person" size={20} color={theme.colors.primary} />
                      <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>View Full Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null;
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Completed Vaccinations Modal */}
      <Modal
        visible={showCompletedModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletedModal(false)}
      >
        <View style={[styles.fullModalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.fullModalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.fullModalTitle, { color: theme.colors.text }]}>Completed Vaccinations</Text>
            <TouchableOpacity onPress={() => setShowCompletedModal(false)}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          {allCompletedVaccines.length > 0 ? (
            <FlatList
              data={allCompletedVaccines}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={[styles.listCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.listIconContainer, { backgroundColor: theme.colors.success }]}>
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={[styles.listTitle, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{item.memberName} • Dose {item.dose}</Text>
                    <Text style={[styles.listDate, { color: theme.colors.textTertiary }]}>
                      {format(parseISO(item.date), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.statusCompleted]}>
                    <Text style={styles.statusBadgeText}>Completed</Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No completed vaccinations yet</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Upcoming Vaccinations Modal */}
      <Modal
        visible={showUpcomingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUpcomingModal(false)}
      >
        <View style={[styles.fullModalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.fullModalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.fullModalTitle, { color: theme.colors.text }]}>Upcoming Vaccinations</Text>
            <TouchableOpacity onPress={() => setShowUpcomingModal(false)}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          {allUpcomingVaccines.length > 0 ? (
            <FlatList
              data={allUpcomingVaccines}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={[styles.listCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.listIconContainer, { backgroundColor: theme.colors.warning }]}>
                    <Ionicons name="calendar" size={28} color="#fff" />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={[styles.listTitle, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{item.memberName} • Dose {item.dose}</Text>
                    <Text style={[styles.listDate, { color: theme.colors.textTertiary }]}>
                      {format(parseISO(item.date), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.statusUpcoming]}>
                    <Text style={styles.statusBadgeText}>Upcoming</Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No upcoming vaccinations</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    paddingTop: STATUS_BAR_HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  userSubtext: {
    fontSize: 13,
    color: '#059669',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10b981',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#059669',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
  },
  seeAllText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  nextDoseCard: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextDoseIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nextDoseContent: {
    flex: 1,
  },
  nextDoseVaccine: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  nextDoseMember: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  nextDoseDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextDoseDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  appointmentLeft: {
    marginRight: 16,
  },
  appointmentDate: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentDay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065f46',
  },
  appointmentMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentVaccine: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  appointmentMember: {
    fontSize: 13,
    color: '#059669',
    marginBottom: 6,
  },
  appointmentDose: {
    alignSelf: 'flex-start',
  },
  doseText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065f46',
  },
  modalBody: {
    padding: 20,
  },
  modalMemberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#ecfdf5',
  },
  modalMemberInfo: {
    flex: 1,
  },
  modalMemberName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 4,
  },
  modalMemberDetails: {
    fontSize: 14,
    color: '#059669',
  },
  modalSection: {
    gap: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalInfoText: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  modalSubValue: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  modalActions: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  fullModalContainer: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
  },
  fullModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    gap: 12,
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  listIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#065f46',
  },
  listSubtitle: {
    fontSize: 14,
    marginBottom: 2,
    color: '#059669',
  },
  listDate: {
    fontSize: 12,
    color: '#059669',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusUpcoming: {
    backgroundColor: '#ecfdf5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activitiesList: {
    gap: 0,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: 'white',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#065f46',
  },
  activitySubtitle: {
    fontSize: 12,
    marginBottom: 4,
    color: '#059669',
  },
  activityDate: {
    fontSize: 11,
    color: '#059669',
  },
  emptyActivitiesContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
  },
});
