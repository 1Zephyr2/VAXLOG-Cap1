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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';
import { format, parseISO } from 'date-fns';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function VaccinationsScreen() {
  const { familyMembers } = useFamily();
  const { theme } = useTheme();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    familyMembers.length > 0 ? familyMembers[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId);
  
  const filteredVaccines = useMemo(() => {
    if (!selectedMember) return [];
    if (!searchQuery.trim()) return selectedMember.vaccineHistory;
    
    return selectedMember.vaccineHistory.filter((vaccine) =>
      vaccine.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [selectedMember, searchQuery]);

  const completed = filteredVaccines.filter((v) => v.status === 'Completed');
  const upcoming = filteredVaccines.filter((v) => v.status === 'Upcoming');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Vaccinations</Text>
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
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
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
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search vaccines..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.completedCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="checkmark-circle" size={32} color="#15803d" />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{completed.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, styles.upcomingCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="time" size={32} color="#b45309" />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{upcoming.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Upcoming</Text>
          </View>
        </View>

        {/* Upcoming Vaccinations */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming</Text>
            {upcoming
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((vaccine, index) => (
                <View key={index} style={[styles.vaccineCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.vaccineInfo}>
                    <Text style={[styles.vaccineName, { color: theme.colors.text }]}>{vaccine.name}</Text>
                    <Text style={[styles.vaccineDetails, { color: theme.colors.textSecondary }]}>
                      Dose {vaccine.dose}
                    </Text>
                    <Text style={[styles.vaccineDate, { color: theme.colors.textSecondary }]}>
                      {format(parseISO(vaccine.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.badge, styles.upcomingBadge]}>
                    <Text style={styles.badgeText}>Upcoming</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Completed Vaccinations */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Completed</Text>
            {completed
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((vaccine, index) => (
                <View key={index} style={[styles.vaccineCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.vaccineInfo}>
                    <Text style={[styles.vaccineName, { color: theme.colors.text }]}>{vaccine.name}</Text>
                    <Text style={[styles.vaccineDetails, { color: theme.colors.textSecondary }]}>
                      Dose {vaccine.dose}
                    </Text>
                    <Text style={[styles.vaccineDate, { color: theme.colors.textSecondary }]}>
                      {format(parseISO(vaccine.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.badge, styles.completedBadge]}>
                    <Text style={styles.badgeTextGreen}>Completed</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {filteredVaccines.length === 0 && searchQuery.length > 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No vaccines found matching "{searchQuery}"</Text>
          </View>
        )}

        {filteredVaccines.length === 0 && searchQuery.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No vaccination records yet</Text>
          </View>
        )}
          </>
        )}

        {familyMembers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No family members added yet</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  membersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  memberTab: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  memberTabActive: {
    backgroundColor: '#6366f1',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  avatarPlaceholder: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  memberNameActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
  },
  upcomingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#b45309',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  vaccineCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  upcomingBadge: {
    backgroundColor: '#fef3c7',
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  badgeTextGreen: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
