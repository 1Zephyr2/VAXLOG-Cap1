import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function FamilyScreen({ navigation }: any) {
  const { familyMembers } = useFamily();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const mainUser = familyMembers.find((m) => m.relationship === 'Me');
  
  const filteredMembers = useMemo(() => {
    const others = familyMembers.filter((m) => m.relationship !== 'Me');
    if (!searchQuery.trim()) return others;
    
    return others.filter((member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.relationship.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [familyMembers, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>My Family</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFamilyMember')}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Owner Section */}
        {user && (
          <View style={styles.mainUserSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Account Owner</Text>
            <TouchableOpacity
              style={[styles.mainUserCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <View style={styles.mainUserContent}>
                <View style={styles.mainAvatarContainer}>
                  <View style={[styles.mainAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.mainAvatarText}>
                      {user.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={styles.crownBadge}>
                    <Ionicons name="person" size={12} color="#fff" />
                  </View>
                </View>

                <View style={styles.mainUserInfo}>
                  <Text style={[styles.mainUserName, { color: theme.colors.text }]}>{user.name}</Text>
                  <Text style={[styles.mainUserDetails, { color: theme.colors.textSecondary }]}>
                    {user.email}
                  </Text>
                  <View style={styles.mainStatusContainer}>
                    <View style={[styles.badge, styles.verified]}>
                      <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                      <Text style={styles.badgeTextGreen}>Account Owner</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Family Members Section */}
        {familyMembers.filter((m) => m.relationship !== 'Me').length > 0 && (
          <View style={styles.familyMembersSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Family Members</Text>
              <Text style={[styles.memberCount, { color: theme.colors.textSecondary, backgroundColor: theme.colors.iconBackground }]}>{familyMembers.filter((m) => m.relationship !== 'Me').length}</Text>
            </View>
            
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search family members..."
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
            
            {filteredMembers.map((member, index) => (
              <View key={member.id} style={styles.memberRow}>
                {index === 0 && <View style={[styles.hierarchyLineTop, { backgroundColor: theme.colors.border }]} />}
                {index < filteredMembers.length - 1 && <View style={[styles.hierarchyLine, { backgroundColor: theme.colors.border }]} />}
                
                <View style={[styles.hierarchyDot, { borderColor: theme.colors.primary, backgroundColor: theme.colors.background }]} />
                
                <TouchableOpacity
                  style={[styles.memberCard, { backgroundColor: theme.colors.card }]}
                  onPress={() =>
                    navigation.navigate('MemberProfile', { memberId: member.id })
                  }
                >
                  <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {member.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                    <Text style={[styles.memberDetails, { color: theme.colors.textSecondary }]}>
                      {member.relationship} • {member.age} years old
                    </Text>
                    <View style={styles.statusContainer}>
                      {member.isFullyVaccinated ? (
                        <View style={[styles.badge, styles.vaccinated]}>
                          <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                          <Text style={styles.badgeTextGreen}>Fully Vaccinated</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, styles.pending]}>
                          <Ionicons name="time" size={12} color="#b45309" />
                          <Text style={styles.badgeTextOrange}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {familyMembers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No family members yet</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('AddFamilyMember')}
            >
              <Text style={styles.emptyButtonText}>Add Your First Member</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  
  // Main User Section
  mainUserSection: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  mainUserCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e0e7ff',
  },
  mainUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  mainAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  mainAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  crownBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366f1',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  mainUserInfo: {
    flex: 1,
  },
  mainUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  mainUserDetails: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  mainStatusContainer: {
    flexDirection: 'row',
  },
  
  // Family Members Section
  familyMembersSection: {
    padding: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 16,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberRow: {
    position: 'relative',
    marginLeft: 20,
  },
  hierarchyLineTop: {
    position: 'absolute',
    left: 0,
    top: -16,
    width: 2,
    height: 16,
    backgroundColor: '#e5e7eb',
  },
  hierarchyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  hierarchyDot: {
    position: 'absolute',
    left: -4,
    top: 28,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 1,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  memberDetails: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  vaccinated: {
    backgroundColor: '#dcfce7',
  },
  pending: {
    backgroundColor: '#fef3c7',
  },
  verified: {
    backgroundColor: '#dcfce7',
  },
  badgeTextGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  badgeTextOrange: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
