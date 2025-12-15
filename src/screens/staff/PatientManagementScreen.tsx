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
import { useFamily } from '../../context/family-context';
import type { FamilyMember } from '../../lib/data';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function PatientManagementScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { familyMembers, setFamilyMembers } = useFamily();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [addType, setAddType] = useState<'family' | 'member' | null>(null);
  const [selectedFamilyForMember, setSelectedFamilyForMember] = useState<string | null>(null);
  const [showFamilySelectionModal, setShowFamilySelectionModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [selectedFamilyToEdit, setSelectedFamilyToEdit] = useState<string | null>(null);
  const [editedFamilyName, setEditedFamilyName] = useState('');

  const handlePhoneChange = (text: string) => {
    // Only accept numbers
    const numericOnly = text.replace(/[^0-9]/g, '');
    setPatientPhone(numericOnly);
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

  // Group patients by family (same logic as StaffDashboard)
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
    setShowTypeModal(true);
  };

  const handleSelectAddType = (type: 'family' | 'member') => {
    setAddType(type);
    if (type === 'family') {
      setShowTypeModal(false);
      setShowAddModal(true);
    } else {
      // Show family selection for adding member
      setShowTypeModal(false);
      setShowFamilySelectionModal(true);
    }
  };

  const handleSelectFamily = (familyId: string) => {
    setSelectedFamilyForMember(familyId);
    setShowFamilySelectionModal(false);
    setShowAddModal(true);
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

    if (!selectedVaccine) {
      Alert.alert('Error', 'Please select a vaccine for initial vaccination');
      return;
    }

    setIsSaving(true);
    try {
      setTimeout(() => {
        // Create new patient object
        const newPatient: FamilyMember = {
          id: `patient_${Date.now()}`,
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          birthdate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDate.padStart(2, '0')}`,
          age: parseInt(patientAge),
          relationship: addType === 'family' ? 'Me' : 'Family Member',
          avatarUrl: 'https://via.placeholder.com/150',
          isFullyVaccinated: false,
          nextDose: {
            vaccine: selectedVaccine,
            date: new Date().toISOString().split('T')[0],
          },
          vaccineHistory: [
            {
              name: selectedVaccine,
              date: new Date().toISOString().split('T')[0],
              status: 'Upcoming',
              dose: 1,
            },
          ],
        };

        // Add to family members
        const updatedMembers = [...familyMembers, newPatient];
        setFamilyMembers(updatedMembers);

        Alert.alert(
          'Success',
          `Patient ${patientName} (Age ${patientAge}) added successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setIsSaving(false);
                setShowAddModal(false);
                setAddType(null);
                setSelectedFamilyForMember(null);
                setPatientName('');
                setPatientEmail('');
                setPatientPhone('');
                setBirthMonth('');
                setBirthDate('');
                setBirthYear('');
                setPatientAge('');
                setSelectedVaccine('');
              },
            },
          ]
        );
      }, 1000);
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to add patient');
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowTypeModal(false);
    setShowFamilySelectionModal(false);
    setAddType(null);
    setSelectedFamilyForMember(null);
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setBirthMonth('');
    setBirthDate('');
    setBirthYear('');
    setPatientAge('');
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
        const updatedMembers = familyMembers.map(member => {
          // Check if this member belongs to the family being edited
          const memberFamilyOwner = member.relationship === 'Me' 
            ? member 
            : familyMembers.find(m => m.relationship === 'Me' && m.name.split(' ')[1] === member.name.split(' ')[1]);
          
          if (memberFamilyOwner?.id === selectedFamilyToEdit) {
            // Update the member's name with the new last name
            const firstName = member.name.split(' ')[0];
            return { ...member, name: `${firstName} ${lastNamePart}` };
          }
          return member;
        });

        setFamilyMembers(updatedMembers);
        setShowEditFamilyModal(false);
        setSelectedFamilyToEdit(null);
        setEditedFamilyName('');
        Alert.alert('Success', 'Family group name updated successfully');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>Patients</Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddPatient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
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
          
          return (
            <View key={family.owner.id} style={[styles.familyCardContainer, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity 
                style={styles.familyHeaderSection}
                onPress={() => toggleFamily(family.owner.id)}
              >
                <View style={styles.familyInfo}>
                  <Text style={[styles.familyGroupLabel, { color: theme.colors.textSecondary }]}>FAMILY GROUP</Text>
                  <View style={styles.familyNameRow}>
                    <Text style={[styles.familyName, { color: theme.colors.text }]}>
                      {family.owner.name.split(' ')[1]} Family
                    </Text>
                    <TouchableOpacity 
                      onPress={() => handleEditFamilyName(family.owner.id)}
                      style={styles.editFamilyButton}
                    >
                      <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.badge, { backgroundColor: upToDate === familyMembers.length ? theme.colors.success + '20' : theme.colors.warning + '20' }]}>
                      <Text style={[styles.badgeText, { color: upToDate === familyMembers.length ? theme.colors.success : theme.colors.warning }]}>
                        {upToDate}/{familyMembers.length} Up-to-Date
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
                    {familyMembers.length} {familyMembers.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.membersList, { borderTopColor: theme.colors.border }]}>
                  {familyMembers.map((member) => {
                    const isOwner = member.relationship === 'Me';
                    
                    return (
                      <TouchableOpacity
                        key={member.id}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('MemberProfile', { memberId: member.id })}
                        style={[
                          styles.memberRow, 
                          { 
                            backgroundColor: isOwner ? theme.colors.primary + '08' : 'transparent',
                            borderLeftWidth: isOwner ? 4 : 3,
                            borderLeftColor: isOwner ? theme.colors.primary : theme.colors.border,
                            marginLeft: isOwner ? 0 : 20,
                            borderTopColor: theme.colors.border,
                          }
                        ]}
                      >
                        <Image 
                          source={{ uri: member.avatarUrl }}
                          style={styles.memberAvatar}
                        />
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

      {/* Add Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.typeModalOverlay}>
          <View style={[styles.typeModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.typeModalTitle, { color: theme.colors.text }]}>Add New Patient</Text>
            <Text style={[styles.typeModalSubtitle, { color: theme.colors.textSecondary }]}>Choose an option:</Text>
            
            <TouchableOpacity
              style={[styles.typeOption, { borderColor: theme.colors.primary }]}
              onPress={() => handleSelectAddType('family')}
            >
              <Ionicons name="people" size={32} color={theme.colors.primary} />
              <Text style={[styles.typeOptionTitle, { color: theme.colors.text }]}>Add Family Group</Text>
              <Text style={[styles.typeOptionDesc, { color: theme.colors.textSecondary }]}>
                Create a new family with a primary member
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeOption, { borderColor: theme.colors.primary }]}
              onPress={() => handleSelectAddType('member')}
            >
              <Ionicons name="person-add" size={32} color={theme.colors.primary} />
              <Text style={[styles.typeOptionTitle, { color: theme.colors.text }]}>Add Family Member</Text>
              <Text style={[styles.typeOptionDesc, { color: theme.colors.textSecondary }]}>
                Add a member to an existing family
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeModalCancelButton, { backgroundColor: theme.colors.background }]}
              onPress={handleCloseModal}
            >
              <Text style={[styles.typeModalCancelText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter patient's email"
                placeholderTextColor={theme.colors.textTertiary}
                value={patientEmail}
                onChangeText={setPatientEmail}
                keyboardType="email-address"
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
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Select Vaccine for Initial Vaccination *</Text>
              <ScrollView style={styles.vaccineList} nestedScrollEnabled={true}>
                {vaccines.map((vaccine) => (
                  <TouchableOpacity
                    key={vaccine}
                    style={[
                      styles.vaccineOption,
                      { 
                        backgroundColor: selectedVaccine === vaccine ? theme.colors.primary : theme.colors.card,
                        borderColor: theme.colors.border,
                      }
                    ]}
                    onPress={() => setSelectedVaccine(vaccine)}
                  >
                    <View style={[
                      styles.vaccineCheckbox,
                      { 
                        backgroundColor: selectedVaccine === vaccine ? theme.colors.primary : 'transparent',
                        borderColor: selectedVaccine === vaccine ? theme.colors.primary : theme.colors.border,
                      }
                    ]}>
                      {selectedVaccine === vaccine && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={[
                      styles.vaccineText,
                      { color: selectedVaccine === vaccine ? '#fff' : theme.colors.text }
                    ]}>
                      {vaccine}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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

      {/* Family Selection Modal */}
      <Modal
        visible={showFamilySelectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowFamilySelectionModal(false);
          setShowTypeModal(true);
        }}
      >
        <View style={styles.typeModalOverlay}>
          <View style={[styles.typeModalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.typeModalTitle, { color: theme.colors.text }]}>Select Family</Text>
            <Text style={[styles.typeModalSubtitle, { color: theme.colors.textSecondary }]}>Choose a family to add a member to:</Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {Object.entries(groupedFamilies).map(([familyId, family]) => (
                <TouchableOpacity
                  key={familyId}
                  style={[styles.typeOption, { borderColor: theme.colors.primary }]}
                  onPress={() => handleSelectFamily(familyId)}
                >
                  <Ionicons name="people" size={28} color={theme.colors.primary} />
                  <Text style={[styles.typeOptionTitle, { color: theme.colors.text }]}>
                    {family.owner.name}
                  </Text>
                  <Text style={[styles.typeOptionDesc, { color: theme.colors.textSecondary }]}>
                    {family.members.length} member{family.members.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.typeModalCancelButton, { backgroundColor: theme.colors.background }]}
              onPress={() => {
                setShowFamilySelectionModal(false);
                setShowTypeModal(true);
              }}
            >
              <Text style={[styles.typeModalCancelText, { color: theme.colors.primary }]}>Back</Text>
            </TouchableOpacity>
          </View>
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
  familyName: {
    fontSize: 16,
    fontWeight: '700',
  },
  editFamilyButton: {
    padding: 6,
    borderRadius: 6,
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
  memberCount: {
    fontSize: 13,
  },
  primaryContact: {
    fontSize: 13,
  },
  membersList: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  memberRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
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
    marginBottom: 8,
  },
  memberEmail: {
    fontSize: 11,
    marginBottom: 4,
  },
  primaryContactText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
});
