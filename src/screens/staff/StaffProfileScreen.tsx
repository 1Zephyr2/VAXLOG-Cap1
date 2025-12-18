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
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function StaffProfileScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedPhone, setEditedPhone] = useState(user?.phone || '');
  const [editedPosition, setEditedPosition] = useState('');
  const [editedDepartment, setEditedDepartment] = useState('');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const handlePhoneChange = (text: string) => {
    // Only accept numbers
    const numericOnly = text.replace(/[^0-9]/g, '');
    setEditedPhone(numericOnly);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (editedPhone && editedPhone.length < 10) {
      Alert.alert('Error', 'Phone number must be at least 10 digits');
      return;
    }

    if (editedPhone && editedPhone[0] !== '9') {
      Alert.alert('Error', 'Philippine mobile numbers must start with 9');
      return;
    }

    setIsSaving(true);
    try {
      // Simulate saving - in a real app, this would update to a backend
      setTimeout(() => {
        Alert.alert('Success', 'Profile updated successfully');
        setIsSaving(false);
        setIsEditing(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setEditedPhone(user?.phone || '');
    setIsEditing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header with Edit Button */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleCancel() : setIsEditing(true)}
          style={styles.editButton}
        >
          <Ionicons name={isEditing ? 'close' : 'create-outline'} size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo Section */}
        <View style={[styles.profilePhotoSection, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 'U'}
            </Text>
          </View>
          {isEditing && (
            <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Editable Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.textTertiary}
              value={editedName}
              onChangeText={setEditedName}
              editable={isEditing}
              pointerEvents={isEditing ? 'auto' : 'none'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textTertiary}
              value={editedEmail}
              onChangeText={setEditedEmail}
              editable={isEditing}
              pointerEvents={isEditing ? 'auto' : 'none'}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.phonePrefix, { color: theme.colors.textSecondary }]}>+63</Text>
              <TextInput
                style={[styles.phoneInput, { color: theme.colors.text }]}
                placeholder="9XX XXX XXXX"
                placeholderTextColor={theme.colors.textTertiary}
                value={editedPhone}
                onChangeText={handlePhoneChange}
                editable={isEditing}
                pointerEvents={isEditing ? 'auto' : 'none'}
                keyboardType="numeric"
                maxLength={11}
              />
            </View>
            {editedPhone && editedPhone.length < 10 && isEditing && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Phone number must be at least 10 digits
              </Text>
            )}
            {editedPhone && editedPhone.length >= 10 && editedPhone[0] !== '9' && isEditing && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Philippine mobile numbers must start with 9
              </Text>
            )}
          </View>
        </View>

        {/* Professional Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Professional Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Position</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Your position"
              placeholderTextColor={theme.colors.textTertiary}
              value={editedPosition}
              onChangeText={setEditedPosition}
              editable={isEditing}
              pointerEvents={isEditing ? 'auto' : 'none'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Department</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Your department"
              placeholderTextColor={theme.colors.textTertiary}
              value={editedDepartment}
              onChangeText={setEditedDepartment}
              editable={isEditing}
              pointerEvents={isEditing ? 'auto' : 'none'}
            />
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="id-card-outline" size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Employee ID</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>EMP-2024-001</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: theme.colors.primary }]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
          <TouchableOpacity 
            style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsTitle, { color: theme.colors.text }]}>App Settings</Text>
              <Text style={[styles.settingsSubtitle, { color: theme.colors.textSecondary }]}>Preferences & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profilePhotoSection: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
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
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
  },
});
