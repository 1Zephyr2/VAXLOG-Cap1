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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function EditProfileScreen({ navigation }: any) {
  const { familyMembers, setFamilyMembers } = useFamily();
  const { theme } = useTheme();
  const mainUser = familyMembers.find((m) => m.relationship === 'Me');

  const [name, setName] = useState(mainUser?.name || '');
  const [email, setEmail] = useState(mainUser?.email || '');
  const [phone, setPhone] = useState(mainUser?.phone || '');
  const [birthdate, setBirthdate] = useState(mainUser?.birthdate || '');
  const [isSaving, setIsSaving] = useState(false);

  const handlePhoneChange = (text: string) => {
    // Only accept numbers
    const numericOnly = text.replace(/[^0-9]/g, '');
    setPhone(numericOnly);
  };

  const handleSave = async () => {
    if (!mainUser) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (phone && phone.length < 10) {
      Alert.alert('Error', 'Phone number must be at least 10 digits');
      return;
    }

    setIsSaving(true);
    try {
      const updatedMembers = familyMembers.map((member) => {
        if (member.id === mainUser.id) {
          return {
            ...member,
            name,
            email,
            phone,
            birthdate,
          };
        }
        return member;
      });

      setFamilyMembers(updatedMembers);
      
      setTimeout(() => {
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsSaving(false);
                navigation.goBack();
              },
            },
          ]
        );
      }, 500);
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (!mainUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>No user found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={[styles.avatarSection, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Image source={{ uri: mainUser.avatarUrl }} style={styles.avatar} />
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
              <Text style={[styles.phonePrefix, { color: theme.colors.textSecondary }]}>+1</Text>
              <TextInput
                style={[styles.phoneInput, { color: theme.colors.text }]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="(555) 123-4567"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            {phone && phone.length < 10 && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Phone number must be at least 10 digits
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
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

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
});
