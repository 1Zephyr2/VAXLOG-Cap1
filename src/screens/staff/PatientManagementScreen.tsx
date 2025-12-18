import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme-context';
import { useStaffPatients } from '../../context/staff-patients-context';
import type { FamilyMember } from '../../lib/data';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function PatientManagementScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { staffPatients, addStaffPatient, updateStaffPatient, deleteStaffPatient, loadStaffPatients, syncFamilyMembers } = useStaffPatients();
  // Use staffPatients as familyMembers for compatibility with existing code
  const familyMembers = staffPatients;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [selectedFamilyToEdit, setSelectedFamilyToEdit] = useState<string | null>(null);
  const [editedFamilyName, setEditedFamilyName] = useState('');
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [showLinkFamilyModal, setShowLinkFamilyModal] = useState(false);
  const [selectedPatientToLink, setSelectedPatientToLink] = useState<FamilyMember | null>(null);
  const [showEditRelationshipModal, setShowEditRelationshipModal] = useState(false);
  const [patientToEditRelationship, setPatientToEditRelationship] = useState<FamilyMember | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<FamilyMember | null>(null);

  const handlePhoneChange = (text: string) => {
    // Only accept numbers
    const numericOnly = text.replace(/[^0-9]/g, '');
    setPatientPhone(numericOnly);
  };

  // Auto-fill patient information if account exists
  const handleEmailBlur = async () => {
    if (!patientEmail.trim() || !patientEmail.includes('@')) {
      return;
    }

    setIsCheckingAccount(true);
    try {
      // Check if email exists in users collection
      const usersQuery = query(collection(db, 'users'), where('email', '==', patientEmail.trim()));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        
        // Auto-fill available information
        if (userData.name && !patientName) {
          setPatientName(userData.name);
        }
        if (userData.phone && !patientPhone) {
          setPatientPhone(userData.phone);
        }
        if (userData.birthdate && !birthYear) {
          // Parse birthdate (YYYY-MM-DD)
          const [year, month, day] = userData.birthdate.split('-');
          setBirthYear(year);
          setBirthMonth(month);
          setBirthDate(day);
          if (userData.age) {
            setPatientAge(userData.age.toString());
          }
        }
        
        Alert.alert(
          '✓ Account Found',
          `Patient information auto-filled from registered account: ${userData.name}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking for account:', error);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const calculateAge = (month: string, date: string, year: string) => {
    if (!month || !date || !year) {
      setPatientAge('');
      return;
    }

    try {
      const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(date));
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setPatientAge(age.toString());
    } catch (error) {
      setPatientAge('');
    }
  };

  const handleMonthChange = (text: string) => {
    const month = text.replace(/[^0-9]/g, '').slice(0, 2);
    if (month === '' || (parseInt(month) >= 1 && parseInt(month) <= 12)) {
      setBirthMonth(month);
      calculateAge(month, birthDate, birthYear);
    }
  };

  const handleDateChange = (text: string) => {
    const date = text.replace(/[^0-9]/g, '').slice(0, 2);
    if (date === '' || (parseInt(date) >= 1 && parseInt(date) <= 31)) {
      setBirthDate(date);
      calculateAge(birthMonth, date, birthYear);
    }
  };

  const handleYearChange = (text: string) => {
    const year = text.replace(/[^0-9]/g, '').slice(0, 4);
    setBirthYear(year);
    calculateAge(birthMonth, birthDate, year);
  };

  const vaccines = [
    'MMR (Measles, Mumps, Rubella)',
    'DTaP (Diphtheria, Tetanus, Pertussis)',
    'Hepatitis B',
    'Polio (IPV)',
    'Varicella (Chickenpox)',
    'COVID-19',
    'Influenza',
    'Meningitis (Meningococcal)',
    'HPV',
  ];

  // Group patients by family
  const groupedFamilies = familyMembers.reduce((acc, member) => {
    // Use familyGroupId or linkedAccountEmail or matching last name + email to group family members
    let familyKey: string;
    let familyOwner: any;
    
    // If patient has familyGroupId, use that to group
    if (member.familyGroupId) {
      familyKey = member.familyGroupId;
      // The owner is the person whose ID matches the familyGroupId
      familyOwner = familyMembers.find(m => m.id === familyKey) ||
                    // Or find someone with 'Me' relationship in this family group
                    familyMembers.find(m => m.familyGroupId === familyKey && m.relationship === 'Me') ||
                    // Or use the oldest member in the group
                    familyMembers.filter(m => m.familyGroupId === familyKey)
                      .sort((a, b) => (b.age || 0) - (a.age || 0))[0] ||
                    member;
    }
    // Try to group by email (exact match or domain match) and last name
    else {
      const memberLastName = member.name.split(' ')[1];
      const memberEmail = member.email || member.linkedAccountEmail;
      
      // Find other members with same last name and email
      const potentialFamily = familyMembers.filter(m => {
        const mLastName = m.name.split(' ')[1];
        const mEmail = m.email || m.linkedAccountEmail;
        return mLastName === memberLastName && mEmail === memberEmail && memberLastName && memberEmail;
      });
      
      if (potentialFamily.length > 1) {
        // Multiple members with same last name and email = family
        familyOwner = potentialFamily.find(m => m.relationship === 'Me') || 
                      potentialFamily.sort((a, b) => (b.age || 0) - (a.age || 0))[0]; // Oldest as owner
        familyKey = familyOwner.id;
      } else {
        // Single member = individual
        familyKey = member.id;
        familyOwner = member;
      }
    }
    
    if (!acc[familyKey]) {
      acc[familyKey] = {
        owner: familyOwner,
        members: [],
      };
    }
    
    acc[familyKey].members.push(member);
    return acc;
  }, {} as Record<string, { owner: any; members: any[] }>);

  // Sort members within each family (hierarchical order)
  Object.values(groupedFamilies).forEach(family => {
    family.members.sort((a, b) => {
      // Family owner ALWAYS comes first (by ID)
      if (a.id === family.owner.id) return -1;
      if (b.id === family.owner.id) return 1;
      
      // Account owner (relationship === 'Me') comes second
      if (a.relationship === 'Me' && b.relationship !== 'Me') return -1;
      if (b.relationship === 'Me' && a.relationship !== 'Me') return 1;
      
      // Define relationship hierarchy priority
      const relationshipPriority: Record<string, number> = {
        'Me': 0,
        'Spouse': 1,
        'Father': 2,
        'Mother': 2,
        'Son': 3,
        'Daughter': 3,
        'Brother': 4,
        'Sister': 4,
        'Grandfather': 5,
        'Grandmother': 5,
        'Grandson': 6,
        'Granddaughter': 6,
        'Individual': 999,
      };
      
      const aPriority = relationshipPriority[a.relationship] ?? 999;
      const bPriority = relationshipPriority[b.relationship] ?? 999;
      
      // Sort by relationship priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same relationship level, sort by age (oldest first)
      return (b.age || 0) - (a.age || 0);
    });
  });

  // Filter families based on search
  const filteredFamilies = Object.values(groupedFamilies).filter(family =>
    family.members.some(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const toggleFamily = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const handleAddPatient = () => {
    setShowAddModal(true);
  };

  // Check if patient has a registered account with family members
  const checkForFamilyAccount = async (email: string) => {
    try {
      // Check if email exists in users collection
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        return null; // No registered account
      }

      const userData = usersSnapshot.docs[0].data();
      const userId = usersSnapshot.docs[0].id;

      // Check for family members in familyMembers collection
      const familyQuery = query(collection(db, 'familyMembers'), where('userId', '==', userId));
      const familySnapshot = await getDocs(familyQuery);

      if (!familySnapshot.empty) {
        return {
          userId,
          userName: userData.name,
          familySize: familySnapshot.size,
          familyMembers: familySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking for family account:', error);
      return null;
    }
  };

  const handleSaveNewPatient = async () => {
    if (!patientName.trim()) {
      Alert.alert('Error', 'Patient name is required');
      return;
    }

    if (!patientEmail.trim()) {
      Alert.alert('Error', 'Patient email is required');
      return;
    }

    if (!patientPhone.trim()) {
      Alert.alert('Error', 'Patient phone number is required');
      return;
    }

    if (patientPhone.length < 10) {
      Alert.alert('Error', 'Phone number must be at least 10 digits');
      return;
    }

    if (!birthMonth || !birthDate || !birthYear) {
      Alert.alert('Error', 'Please fill in all birthdate fields (Month, Date, Year)');
      return;
    }

    if (!patientAge) {
      Alert.alert('Error', 'Invalid birthdate');
      return;
    }

    setIsSaving(true);
    try {
      // Create new patient object (without id - Firebase will generate it)
      const newPatient = {
        name: patientName,
        email: patientEmail,
        phone: patientPhone,
        birthdate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDate.padStart(2, '0')}`,
        age: parseInt(patientAge),
        gender: 'Male',
        relationship: 'Individual', // Always individual - system will detect families later
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patientName)}&backgroundColor=6366f1`,
        isFullyVaccinated: false,
        linkedAccountEmail: patientEmail, // Store email for future family detection
        ...(selectedVaccine && {
          nextDose: {
            vaccine: selectedVaccine,
            date: new Date().toISOString().split('T')[0],
          },
          vaccineHistory: [
            {
              name: selectedVaccine,
              date: new Date().toISOString().split('T')[0],
              status: 'Upcoming' as 'Upcoming',
              dose: '1',
            },
          ],
        }),
      } as Omit<FamilyMember, 'id'>;

      // Check if patient has a registered account with family members BEFORE saving
      const familyDetected = await checkForFamilyAccount(patientEmail);

      if (familyDetected && familyDetected.familyMembers && familyDetected.familyMembers.length > 0) {
        // First, add the account owner (the person who registered)
        const ownerData = {
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          birthdate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDate.padStart(2, '0')}`,
          age: parseInt(patientAge),
          gender: patientGender || 'Male',
          relationship: 'Me',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patientName)}&backgroundColor=6366f1`,
          isFullyVaccinated: false,
          linkedAccountEmail: patientEmail,
          familyGroupId: '', // Will be set to owner's ID after creation
          nextDose: null,
          vaccineHistory: [],
        } as Omit<FamilyMember, 'id'>;
        
        // Add owner first and get their ID
        const ownerId = await addStaffPatient(ownerData);
        
        // Update owner's familyGroupId to point to themselves
        await updateStaffPatient(ownerId, { familyGroupId: ownerId });
        
        // Then add ALL family members from the registered account with owner's ID as familyGroupId
        for (const familyMember of familyDetected.familyMembers) {
          const fmData = familyMember as any;
          const memberData = {
            name: fmData.name || patientName,
            email: fmData.email || patientEmail,
            phone: fmData.phone || patientPhone,
            birthdate: fmData.birthdate || `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDate.padStart(2, '0')}`,
            age: fmData.age || parseInt(patientAge),
            gender: fmData.gender || 'Male',
            relationship: fmData.relationship || 'Individual',
            avatarUrl: fmData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fmData.name || patientName)}&backgroundColor=6366f1`,
            isFullyVaccinated: fmData.isFullyVaccinated || false,
            linkedAccountEmail: patientEmail, // Link all family members to the main account email
            familyGroupId: ownerId, // Use owner's document ID as family group ID
            nextDose: fmData.nextDose || null,
            vaccineHistory: fmData.vaccineHistory || [],
          } as Omit<FamilyMember, 'id'>;
          
          await addStaffPatient(memberData);
        }
        
        // Reload patients to ensure correct state
        await loadStaffPatients();
        
        const totalMembers = familyDetected.familySize + 1; // +1 for the owner
        Alert.alert(
          'Success',
          `Family added! ${totalMembers} family member(s) imported (${patientName} + ${familyDetected.familySize} family members).`,
          [
            {
              text: 'OK',
              onPress: () => handleCloseModal(),
            },
          ]
        );
      } else {
        // No family account - just add the individual patient
        await addStaffPatient(newPatient);
        
        Alert.alert(
          'Success',
          `Patient ${patientName} (Age ${patientAge}) added successfully!`,
          [
            {
              text: 'OK',
              onPress: () => handleCloseModal(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      Alert.alert('Error', 'Failed to add patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setBirthMonth('');
    setBirthDate('');
    setBirthYear('');
    setPatientAge('');
    setPatientGender('Male');
    setSelectedVaccine('');
  };

  const handleEditPatient = (patientId: string, patientName: string) => {
    Alert.alert('Edit Patient', `Edit information for ${patientName}`);
  };

  const handleArchivePatient = (patientName: string) => {
    Alert.alert(
      'Archive Patient',
      `Archive ${patientName}'s record? This can be undone later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => Alert.alert('Success', 'Patient archived') },
      ]
    );
  };

  const handleEditFamilyName = (familyId: string) => {
    const family = groupedFamilies[familyId];
    if (family) {
      setSelectedFamilyToEdit(familyId);
      // Extract just the last name from the family owner's name
      const lastNameOnly = family.owner.name.split(' ')[1] || family.owner.name;
      setEditedFamilyName(lastNameOnly);
      setShowEditFamilyModal(true);
    }
  };

  const handleSaveEditedFamilyName = () => {
    if (!editedFamilyName.trim()) {
      Alert.alert('Error', 'Family group name cannot be empty');
      return;
    }

    if (selectedFamilyToEdit) {
      // Get the family that's being edited
      const familyToEdit = groupedFamilies[selectedFamilyToEdit];
      
      if (familyToEdit) {
        // Extract the last name from the edited family name (e.g., "Smith Family" -> "Smith")
        const lastNamePart = editedFamilyName.split(' ')[0];
        
        // Update all members of this family group with the new last name
        familyToEdit.members.forEach(async (member) => {
          const firstName = member.name.split(' ')[0];
          const newName = `${firstName} ${lastNamePart}`;
          try {
            await updateStaffPatient(member.id, { name: newName });
          } catch (error) {
            console.error('Error updating member name:', error);
          }
        });

        setShowEditFamilyModal(false);
        setSelectedFamilyToEdit(null);
        setEditedFamilyName('');
        Alert.alert('Success', 'Family group name updated successfully');
      }
    }
  };

  const handleDeleteIndividualPatient = (patient: FamilyMember) => {
    Alert.alert(
      'Remove Patient',
      `Are you sure you want to remove ${patient.name} from your patient list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteStaffPatient(patient.id);
              Alert.alert('Success', `${patient.name} has been removed from your patient list`);
            } catch (error) {
              console.error('Error deleting patient:', error);
              Alert.alert('Error', 'Failed to remove patient. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteFamilyGroup = (family: { owner: any; members: any[] }) => {
    Alert.alert(
      'Remove Family Group',
      `Remove ${family.owner.name}'s family group? This will remove all ${family.members.length} member(s) from your patient list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Delete all family members
              for (const member of family.members) {
                await deleteStaffPatient(member.id);
              }
              Alert.alert('Success', `${family.owner.name}'s family has been removed from your patient list`);
            } catch (error) {
              console.error('Error deleting family:', error);
              Alert.alert('Error', 'Failed to remove family group. Please try again.');
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>Patients</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.syncButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={async () => {
                await syncFamilyMembers();
                Alert.alert('Success', 'Family members synced successfully');
              }}
            >
              <Ionicons name="sync" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddPatient}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search patients..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{familyMembers.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Patients</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>{familyMembers.filter(m => m.isFullyVaccinated).length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Up to Date</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.warning }]}>{familyMembers.filter(m => !m.isFullyVaccinated).length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Needs Update</Text>
          </View>
        </View>

        {/* Family List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>All Patients</Text>
        {filteredFamilies.map((family) => {
          const isExpanded = expandedFamilies.has(family.owner.id);
          const familyMembers = family.members;
          const upToDate = familyMembers.filter(m => m.isFullyVaccinated).length;
          const isFamilyGroup = familyMembers.length > 1;
          
          // For single patients, render as a simple card without dropdown
          if (!isFamilyGroup) {
            const member = familyMembers[0];
            return (
              <TouchableOpacity
                key={family.owner.id}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedPatientDetails(member);
                  setShowPatientDetailsModal(true);
                }}
                style={[styles.familyCardContainer, { backgroundColor: theme.colors.card }]}
              >
                <View style={styles.singlePatientContainer}>
                  <View style={[styles.singlePatientAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {member.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={styles.singlePatientInfo}>
                    <View style={styles.singlePatientHeader}>
                      <Text style={[styles.singlePatientName, { color: theme.colors.text }]}>
                        {member.name}
                      </Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedPatientToLink(member);
                          setShowLinkFamilyModal(true);
                        }}
                        style={styles.linkButton}
                      >
                        <Ionicons name="link" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.memberDetails, { color: theme.colors.textSecondary }]}>
                      {member.age} years • {member.gender}
                    </Text>
                    <Text style={[styles.memberEmail, { color: theme.colors.textTertiary }]}>
                      {member.email}
                    </Text>
                    <View style={styles.singlePatientBadges}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setPatientToEditRelationship(member);
                          setSelectedRelationship(member.relationship);
                          setShowEditRelationshipModal(true);
                        }}
                        style={styles.relationshipButton}
                      >
                        <Text style={[styles.relationshipButtonText, { color: theme.colors.textSecondary }]}>
                          {member.relationship}
                        </Text>
                        <Ionicons name="pencil" size={12} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <View style={[styles.badge, { backgroundColor: member.isFullyVaccinated ? theme.colors.success + '20' : theme.colors.warning + '20' }]}>
                        <Text style={[styles.badgeText, { color: member.isFullyVaccinated ? theme.colors.success : theme.colors.warning }]}>
                          {member.isFullyVaccinated ? 'Up-to-Date' : 'Needs Update'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.singlePatientActions}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteIndividualPatient(member);
                      }}
                      style={[styles.deleteButton, { backgroundColor: theme.colors.error + '15' }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={theme.colors.textTertiary} 
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
          
          // For family groups, render with expandable dropdown
          return (
            <View key={family.owner.id} style={[styles.familyCardContainer, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity 
                style={styles.familyHeaderSection}
                onPress={() => toggleFamily(family.owner.id)}
              >
                <View style={styles.familyInfo}>
                  <Text style={[styles.familyGroupLabel, { color: theme.colors.textSecondary }]}>FAMILY GROUP</Text>
                  <View style={styles.familyNameWithEdit}>
                    <Text style={[styles.familyName, { color: theme.colors.text }]}>
                      {family.owner.name}'s Family
                    </Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditFamilyName(family.owner.id);
                      }}
                      style={styles.editFamilyButton}
                    >
                      <Ionicons name="pencil" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.familyMetaRow}>
                    <View style={[styles.vaccineBadge, { backgroundColor: upToDate === familyMembers.length ? theme.colors.success + '20' : theme.colors.warning + '20' }]}>
                      <Text style={[styles.vaccineBadgeText, { color: upToDate === familyMembers.length ? theme.colors.success : theme.colors.warning }]}>
                        {upToDate}/{familyMembers.length} Up-to-Date
                      </Text>
                    </View>
                    <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
                      {familyMembers.length} members
                    </Text>
                  </View>
                </View>
                <View style={styles.familyHeaderActions}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteFamilyGroup(family);
                    }}
                    style={[styles.deleteFamilyButton, { backgroundColor: theme.colors.error + '15' }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color={theme.colors.textSecondary} 
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.membersList, { borderTopColor: theme.colors.border }]}>
                  {familyMembers.map((member, index) => {
                    const isOwner = member.id === family.owner.id;
                    
                    return (
                      <View key={member.id} style={styles.hierarchyContainer}>
                        {/* Vertical line connecting to owner */}
                        {!isOwner && (
                          <View style={[styles.hierarchyLine, { 
                            backgroundColor: theme.colors.border,
                            left: 32,
                          }]} />
                        )}
                        
                        {/* Horizontal connector from vertical line */}
                        {!isOwner && (
                          <View style={[styles.hierarchyConnector, { 
                            backgroundColor: theme.colors.border,
                            left: 32,
                          }]} />
                        )}
                        
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedPatientDetails(member);
                            setShowPatientDetailsModal(true);
                          }}
                          style={[
                            styles.memberRow, 
                            { 
                              backgroundColor: isOwner ? theme.colors.primary + '08' : 'transparent',
                              borderLeftWidth: isOwner ? 4 : 0,
                              borderLeftColor: isOwner ? theme.colors.primary : 'transparent',
                              marginLeft: isOwner ? 16 : 48,
                              paddingLeft: isOwner ? 12 : 16,
                              borderTopColor: index === 0 ? 'transparent' : theme.colors.border,
                              borderTopWidth: index === 0 ? 0 : 1,
                            }
                          ]}
                        >
                          <View style={[styles.memberAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {member.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                            </Text>
                          </View>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              {isOwner && (
                                <View style={[styles.ownerBadgeContainer, { backgroundColor: theme.colors.primary }]}>
                                  <Text style={styles.ownerBadgeText}>Owner</Text>
                                </View>
                              )}
                              <Text style={[styles.memberName, { color: theme.colors.text }]}>
                                {member.name}
                              </Text>
                            </View>
                            <Text style={[styles.memberDetails, { color: theme.colors.textSecondary }]}>
                              {member.age} years • {member.gender} • {member.relationship}
                            </Text>
                            {isOwner && (
                              <Text style={[styles.primaryContactText, { color: theme.colors.primary }]}>
                                Primary Contact: {member.email || member.phone}
                              </Text>
                            )}
                            {!isOwner && member.email && (
                              <Text style={[styles.memberEmail, { color: theme.colors.textTertiary }]}>
                                {member.email}
                              </Text>
                            )}
                          </View>
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={theme.colors.textTertiary} 
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {filteredFamilies.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No patients found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Patient Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Patient</Text>
            <TouchableOpacity onPress={handleCloseModal}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Patient Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter patient's full name"
                placeholderTextColor={theme.colors.textTertiary}
                value={patientName}
                onChangeText={setPatientName}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email *</Text>
                {isCheckingAccount && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Checking...</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter patient's email"
                placeholderTextColor={theme.colors.textTertiary}
                value={patientEmail}
                onChangeText={setPatientEmail}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter patient's phone number"
                placeholderTextColor={theme.colors.textTertiary}
                value={patientPhone}
                onChangeText={handlePhoneChange}
                keyboardType="numeric"
              />
              {patientPhone && patientPhone.length < 10 && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  Phone number must be at least 10 digits
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Date of Birth *</Text>
              <View style={styles.birthdateContainer}>
                <View style={styles.birthdateField}>
                  <Text style={[styles.birthdateLabel, { color: theme.colors.textTertiary }]}>Month</Text>
                  <TextInput
                    style={[styles.birthdateInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="MM"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={birthMonth}
                    onChangeText={handleMonthChange}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.birthdateField}>
                  <Text style={[styles.birthdateLabel, { color: theme.colors.textTertiary }]}>Date</Text>
                  <TextInput
                    style={[styles.birthdateInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="DD"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={birthDate}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.birthdateField}>
                  <Text style={[styles.birthdateLabel, { color: theme.colors.textTertiary }]}>Year</Text>
                  <TextInput
                    style={[styles.birthdateInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="YYYY"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={birthYear}
                    onChangeText={handleYearChange}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>

            {patientAge && (
              <View style={[styles.ageDisplay, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.ageDisplayText, { color: theme.colors.primary }]}>
                  Calculated Age: {patientAge} years old
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Gender</Text>
              <View style={styles.genderOptions}>
                {['Male', 'Female', 'Other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      { 
                        backgroundColor: patientGender === gender ? theme.colors.primary : theme.colors.card,
                        borderColor: patientGender === gender ? theme.colors.primary : theme.colors.border,
                      }
                    ]}
                    onPress={() => setPatientGender(gender)}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      { color: patientGender === gender ? '#fff' : theme.colors.text }
                    ]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.primary }]}
                onPress={handleCloseModal}
                disabled={isSaving}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveNewPatient}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Patient</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Family Name Modal */}
      <Modal
        visible={showEditFamilyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditFamilyModal(false);
          setSelectedFamilyToEdit(null);
          setEditedFamilyName('');
        }}
      >
        <View style={styles.typeModalOverlay}>
          <View style={[styles.typeModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.typeModalTitle, { color: theme.colors.text }]}>Edit Family Group Name</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Family Group Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter family group name"
                placeholderTextColor={theme.colors.textTertiary}
                value={editedFamilyName}
                onChangeText={setEditedFamilyName}
              />
            </View>

            <TouchableOpacity
              style={[styles.typeOption, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              onPress={handleSaveEditedFamilyName}
            >
              <Ionicons name="checkmark" size={28} color="white" />
              <Text style={[styles.typeOptionTitle, { color: 'white' }]}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeModalCancelButton, { backgroundColor: theme.colors.background }]}
              onPress={() => {
                setShowEditFamilyModal(false);
                setSelectedFamilyToEdit(null);
                setEditedFamilyName('');
              }}
            >
              <Text style={[styles.typeModalCancelText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Patient Details Modal */}
      <Modal
        visible={showPatientDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPatientDetailsModal(false);
          setSelectedPatientDetails(null);
        }}
      >
        <View style={styles.detailsModalOverlay}>
          <View style={[styles.detailsModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.detailsModalHeader}>
              <Text style={[styles.detailsModalTitle, { color: theme.colors.text }]}>Patient Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPatientDetailsModal(false);
                  setSelectedPatientDetails(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsScrollView}>
              {selectedPatientDetails && (
                <>
                  <View style={styles.detailsAvatarSection}>
                    <View style={[styles.detailsAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {selectedPatientDetails.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                      </Text>
                    </View>
                    <Text style={[styles.detailsName, { color: theme.colors.text }]}>
                      {selectedPatientDetails.name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: selectedPatientDetails.isFullyVaccinated ? theme.colors.success + '20' : theme.colors.warning + '20' }]}>
                      <Text style={[styles.badgeText, { color: selectedPatientDetails.isFullyVaccinated ? theme.colors.success : theme.colors.warning }]}>
                        {selectedPatientDetails.isFullyVaccinated ? 'Up-to-Date' : 'Needs Update'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
                    
                    <View style={styles.detailsRow}>
                      <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Relationship</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.relationship}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Age</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.age} years</Text>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <Ionicons name="male-female" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Gender</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.gender}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <Ionicons name="gift" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Birthdate</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.birthdate}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: theme.colors.text }]}>Contact Information</Text>
                    
                    <View style={styles.detailsRow}>
                      <Ionicons name="mail" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.email}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <Ionicons name="call" size={20} color={theme.colors.textSecondary} />
                      <View style={styles.detailsRowContent}>
                        <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                        <Text style={[styles.detailsValue, { color: theme.colors.text }]}>+63 {selectedPatientDetails.phone}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedPatientDetails.nextDose && (
                    <View style={styles.detailsSection}>
                      <Text style={[styles.detailsSectionTitle, { color: theme.colors.text }]}>Next Vaccination</Text>
                      
                      <View style={styles.detailsRow}>
                        <Ionicons name="medical" size={20} color={theme.colors.primary} />
                        <View style={styles.detailsRowContent}>
                          <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Vaccine</Text>
                          <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.nextDose.vaccine}</Text>
                        </View>
                      </View>

                      <View style={styles.detailsRow}>
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                        <View style={styles.detailsRowContent}>
                          <Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Date</Text>
                          <Text style={[styles.detailsValue, { color: theme.colors.text }]}>{selectedPatientDetails.nextDose.date}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Relationship Modal */}
      <Modal
        visible={showEditRelationshipModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditRelationshipModal(false);
          setPatientToEditRelationship(null);
        }}
      >
        <View style={styles.typeModalOverlay}>
          <View style={[styles.typeModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.typeModalTitle, { color: theme.colors.text }]}>Edit Relationship</Text>
            <Text style={[styles.typeModalSubtitle, { color: theme.colors.textSecondary }]}>
              Set the relationship/role for {patientToEditRelationship?.name}
            </Text>

            <View style={styles.relationshipGrid}>
              {['Me', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter', 'Individual'].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[
                    styles.relationshipOption,
                    {
                      borderColor: selectedRelationship === rel ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedRelationship === rel ? theme.colors.primary + '15' : 'transparent',
                    }
                  ]}
                  onPress={() => setSelectedRelationship(rel)}
                >
                  <Text style={[styles.relationshipOptionText, { color: selectedRelationship === rel ? theme.colors.primary : theme.colors.text }]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.typeOption, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              onPress={async () => {
                if (patientToEditRelationship) {
                  try {
                    await updateStaffPatient(patientToEditRelationship.id, {
                      relationship: selectedRelationship,
                    });
                    Alert.alert('Success', `Relationship updated to ${selectedRelationship}`);
                    setShowEditRelationshipModal(false);
                    setPatientToEditRelationship(null);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update relationship');
                  }
                }
              }}
            >
              <Ionicons name="checkmark" size={28} color="white" />
              <Text style={[styles.typeOptionTitle, { color: 'white' }]}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeModalCancelButton, { backgroundColor: theme.colors.background }]}
              onPress={() => {
                setShowEditRelationshipModal(false);
                setPatientToEditRelationship(null);
              }}
            >
              <Text style={[styles.typeModalCancelText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Link to Family Modal */}
      <Modal
        visible={showLinkFamilyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowLinkFamilyModal(false);
          setSelectedPatientToLink(null);
        }}
      >
        <View style={styles.typeModalOverlay}>
          <View style={[styles.typeModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.typeModalTitle, { color: theme.colors.text }]}>Link to Family</Text>
            <Text style={[styles.typeModalSubtitle, { color: theme.colors.textSecondary }]}>
              Link {selectedPatientToLink?.name} with another patient to create or join a family
            </Text>

            <ScrollView style={styles.familyListScroll} nestedScrollEnabled={true}>
              {/* Show existing families */}
              {Object.values(groupedFamilies)
                .filter(family => family.members.length > 1)
                .map((family) => (
                  <TouchableOpacity
                    key={family.owner.id}
                    style={[styles.familyLinkOption, { borderColor: theme.colors.border, backgroundColor: theme.colors.primary + '08' }]}
                    onPress={async () => {
                      if (selectedPatientToLink) {
                        try {
                          const newFamilyGroupId = family.owner.familyGroupId || family.owner.id;
                          await updateStaffPatient(selectedPatientToLink.id, {
                            familyGroupId: newFamilyGroupId,
                            linkedAccountEmail: family.owner.linkedAccountEmail || family.owner.email,
                          });
                          
                          // Reload patients to ensure grouping updates
                          await loadStaffPatients();
                          
                          Alert.alert('Success', `${selectedPatientToLink.name} linked to ${family.owner.name.split(' ')[1]} Family!`);
                          setShowLinkFamilyModal(false);
                          setSelectedPatientToLink(null);
                        } catch (error) {
                          console.error('Error linking to family:', error);
                          Alert.alert('Error', 'Failed to link patient to family. Please try again.');
                        }
                      }
                    }}
                  >
                    <View style={styles.familyLinkHeader}>
                      <Ionicons name="people" size={20} color={theme.colors.primary} />
                      <Text style={[styles.familyLinkName, { color: theme.colors.text }]}>
                        {family.owner.name.split(' ')[1]} Family
                      </Text>
                    </View>
                    <Text style={[styles.familyLinkCount, { color: theme.colors.textSecondary }]}>
                      {family.members.length} members
                    </Text>
                  </TouchableOpacity>
                ))}
              
              {/* Show other individual patients */}
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Or create a new family with:
              </Text>
              {familyMembers
                .filter(patient => patient.id !== selectedPatientToLink?.id)
                .map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[styles.patientLinkOption, { borderColor: theme.colors.border }]}
                    onPress={async () => {
                      if (selectedPatientToLink) {
                        try {
                          // Create a new family group ID using the older patient's ID
                          const olderPatient = patient.age >= selectedPatientToLink.age ? patient : selectedPatientToLink;
                          const newFamilyGroupId = olderPatient.id;
                          const sharedEmail = patient.email || selectedPatientToLink.email;
                          
                          // Update both patients to share the same familyGroupId
                          await updateStaffPatient(patient.id, {
                            familyGroupId: newFamilyGroupId,
                            linkedAccountEmail: sharedEmail,
                          });
                          await updateStaffPatient(selectedPatientToLink.id, {
                            familyGroupId: newFamilyGroupId,
                            linkedAccountEmail: sharedEmail,
                          });
                          
                          // Reload patients to ensure grouping updates
                          await loadStaffPatients();
                          
                          Alert.alert('Success', `Family created! ${selectedPatientToLink.name} and ${patient.name} are now linked.`);
                          setShowLinkFamilyModal(false);
                          setSelectedPatientToLink(null);
                        } catch (error) {
                          console.error('Error creating family:', error);
                          Alert.alert('Error', 'Failed to create family. Please try again.');
                        }
                      }
                    }}
                  >
                    <View style={[styles.patientLinkAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {patient.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                      </Text>
                    </View>
                    <View style={styles.patientLinkInfo}>
                      <Text style={[styles.patientLinkName, { color: theme.colors.text }]}>
                        {patient.name}
                      </Text>
                      <Text style={[styles.patientLinkDetails, { color: theme.colors.textSecondary }]}>
                        {patient.age} years • {patient.gender}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.typeModalCancelButton, { backgroundColor: theme.colors.background, marginTop: 12 }]}
              onPress={() => {
                setShowLinkFamilyModal(false);
                setSelectedPatientToLink(null);
              }}
            >
              <Text style={[styles.typeModalCancelText, { color: theme.colors.primary }]}>Cancel</Text>
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
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
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
  familyCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  familyCardContainer: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  familyHeader: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyHeaderSection: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyInfo: {
    flex: 1,
  },
  familyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteFamilyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  familyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  familyNameWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  familyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '700',
  },
  editFamilyButton: {
    padding: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  vaccineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  vaccineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryContact: {
    fontSize: 13,
  },
  membersList: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  hierarchyContainer: {
    position: 'relative',
  },
  hierarchyLine: {
    position: 'absolute',
    width: 2,
    top: -16,
    bottom: '50%',
    zIndex: 0,
  },
  hierarchyConnector: {
    position: 'absolute',
    height: 2,
    width: 20,
    top: '50%',
    zIndex: 0,
  },
  memberRow: {
    flexDirection: 'row',
    padding: 16,
    paddingRight: 12,
    gap: 12,
    alignItems: 'center',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e5e5',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ownerBadgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  ownerBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberDetails: {
    fontSize: 13,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 11,
    marginBottom: 4,
  },
  primaryContactText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singlePatientContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingRight: 12,
    alignItems: 'center',
    gap: 12,
  },
  singlePatientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e5e5',
  },
  avatarPlaceholder: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  singlePatientInfo: {
    flex: 1,
  },
  singlePatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  singlePatientName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  singlePatientBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  singlePatientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relationshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  relationshipButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  relationshipOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  relationshipOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  familyListScroll: {
    maxHeight: 400,
    marginVertical: 12,
  },
  familyLinkOption: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  familyLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  familyLinkName: {
    fontSize: 16,
    fontWeight: '600',
  },
  familyLinkCount: {
    fontSize: 13,
    marginLeft: 28,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  patientLinkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  patientLinkAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e5e5',
  },
  patientLinkInfo: {
    flex: 1,
  },
  patientLinkName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  patientLinkDetails: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
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
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 16,
    paddingBottom: 80,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  birthdateContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  birthdateField: {
    flex: 1,
  },
  birthdateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  birthdateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  ageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 16,
  },
  ageDisplayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  vaccineList: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#e5e7eb',
  },
  vaccineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  vaccineCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaccineText: {
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  typeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  typeModalContent: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  typeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  typeModalSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  typeOption: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  typeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeOptionDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  typeModalCancelButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  typeModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  detailsScrollView: {
    paddingHorizontal: 20,
  },
  detailsAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  detailsAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsRowContent: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});

