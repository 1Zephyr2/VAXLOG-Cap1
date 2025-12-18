import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [familyRole, setFamilyRole] = useState(user?.familyRole || '');
  const [isSaving, setIsSaving] = useState(false);

  const handlePhoneChange = (text: string) => {
    // Only accept numbers
    const numericOnly = text.replace(/[^0-9]/g, '');
    setPhone(numericOnly);
  };

  const handleBirthdateChange = (value: string) => {
    // Detect if user is deleting
    const prevLength = birthdate.length;
    const currLength = value.length;
    const isDeleting = currLength < prevLength;
    
    // If deleting, just update the value (allow deletion of dashes)
    if (isDeleting) {
      setBirthdate(value);
      return;
    }
    
    // If adding characters, auto-add dashes at appropriate positions
    let formatted = value.replace(/\D/g, ''); // Remove all non-digits
    
    if (formatted.length >= 4) {
      formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
    }
    if (formatted.length >= 7) {
      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
    }
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    setBirthdate(formatted);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (phone && phone.length < 10) {
      Alert.alert('Error', 'Phone number must be at least 10 digits');
      return;
    }

    if (phone && phone[0] !== '9') {
      Alert.alert('Error', 'Philippine mobile numbers must start with 9');
      return;
    }

    setIsSaving(true);
    try {
      // Calculate age if birthdate provided
      let age: number | undefined;
      if (birthdate) {
        const birthDate = new Date(birthdate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // Update user profile in Firebase
      await updateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone || undefined,
        birthdate: birthdate || undefined,
        age: age,
        gender: gender || undefined,
        familyRole: user?.role === 'patient' ? (familyRole || undefined) : undefined,
      });
      
      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
        {/* Profile Picture */}
        <View style={[styles.avatarSection, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
            </Text>
          </View>
          <TouchableOpacity style={[styles.changePhotoButton, { borderColor: theme.colors.primary }]}>
            <Ionicons name="camera" size={20} color={theme.colors.primary} />
            <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.phonePrefix, { color: theme.colors.textSecondary }]}>+63</Text>
              <TextInput
                style={[styles.phoneInput, { color: theme.colors.text }]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="9XX XXX XXXX"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                maxLength={11}
              />
            </View>
            {phone && phone.length < 10 && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Phone number must be at least 10 digits
              </Text>
            )}
            {phone && phone.length >= 10 && phone[0] !== '9' && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Philippine mobile numbers must start with 9
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Date of Birth</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={birthdate}
                onChangeText={handleBirthdateChange}
                placeholder="YYYY-MM-DD (e.g., 1990-05-15)"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Gender</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { borderColor: theme.colors.primary },
                  gender === 'Male' && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => setGender('Male')}
              >
                <Text style={[
                  styles.genderButtonText,
                  { color: theme.colors.text },
                  gender === 'Male' && { color: theme.colors.primary, fontWeight: '700' }
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { borderColor: theme.colors.primary },
                  gender === 'Female' && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => setGender('Female')}
              >
                <Text style={[
                  styles.genderButtonText,
                  { color: theme.colors.text },
                  gender === 'Female' && { color: theme.colors.primary, fontWeight: '700' }
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {user?.role === 'patient' && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Your Role</Text>
              <View style={styles.familyRoleButtonsGrid}>
                <TouchableOpacity
                  style={[
                    styles.familyRoleButton,
                    { borderColor: theme.colors.primary },
                    familyRole === 'Father' && { backgroundColor: theme.colors.primary + '20' }
                  ]}
                  onPress={() => setFamilyRole('Father')}
                >
                  <Text style={[
                    styles.familyRoleButtonText,
                    { color: theme.colors.text },
                    familyRole === 'Father' && { color: theme.colors.primary, fontWeight: '700' }
                  ]}>
                    Father
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.familyRoleButton,
                    { borderColor: theme.colors.primary },
                    familyRole === 'Mother' && { backgroundColor: theme.colors.primary + '20' }
                  ]}
                  onPress={() => setFamilyRole('Mother')}
                >
                  <Text style={[
                    styles.familyRoleButtonText,
                    { color: theme.colors.text },
                    familyRole === 'Mother' && { color: theme.colors.primary, fontWeight: '700' }
                  ]}>
                    Mother
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.familyRoleButton,
                    { borderColor: theme.colors.primary },
                    familyRole === 'Guardian' && { backgroundColor: theme.colors.primary + '20' }
                  ]}
                  onPress={() => setFamilyRole('Guardian')}
                >
                  <Text style={[
                    styles.familyRoleButtonText,
                    { color: theme.colors.text },
                    familyRole === 'Guardian' && { color: theme.colors.primary, fontWeight: '700' }
                  ]}>
                    Guardian
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.familyRoleButton,
                    { borderColor: theme.colors.primary },
                    familyRole === 'Individual' && { backgroundColor: theme.colors.primary + '20' }
                  ]}
                  onPress={() => setFamilyRole('Individual')}
                >
                  <Text style={[
                    styles.familyRoleButtonText,
                    { color: theme.colors.text },
                    familyRole === 'Individual' && { color: theme.colors.primary, fontWeight: '700' }
                  ]}>
                    Individual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
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
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
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
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  familyRoleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  familyRoleButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  familyRoleButton: {
    width: '48%',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  familyRoleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
