import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFamily } from '../../context/family-context';
import { useTheme } from '../../context/theme-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function EditMemberScreen({ route, navigation }: any) {
  const { memberId } = route.params;
  const { familyMembers, setFamilyMembers } = useFamily();
  const { theme } = useTheme();
  const member = familyMembers.find((m) => m.id === memberId);

  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  
  // Documents and ID
  const [idDocument, setIdDocument] = useState<any>(null);
  const [medicalDocuments, setMedicalDocuments] = useState<any[]>([]);
  const [avatarImage, setAvatarImage] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    birthdate: '',
    relationship: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (member) {
      setName(member.name);
      setBirthdate(member.birthdate);
      setRelationship(member.relationship);
      setPhone(member.phone || '');
      setEmail(member.email || '');
      setGender(member.gender);
      setAvatarImage(member.avatarUrl || '');
      setIdDocument((member as any).documents?.idDocument || null);
      setMedicalDocuments((member as any).documents?.medicalDocuments || []);
    }
  }, [member]);

  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Member not found</Text>
        </View>
      </View>
    );
  }

  // Validation functions
  const validateName = (value: string) => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
      return 'Name should only contain letters';
    }
    return '';
  };

  const validateBirthdate = (value: string) => {
    if (!value.trim()) {
      return 'Birthdate is required';
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return 'Use format: YYYY-MM-DD';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    const today = new Date();
    if (date > today) {
      return 'Birthdate cannot be in the future';
    }
    const age = today.getFullYear() - date.getFullYear();
    if (age > 150) {
      return 'Please enter a valid birthdate';
    }
    return '';
  };

  const validateRelationship = (value: string) => {
    if (!value.trim()) {
      return 'Relationship is required';
    }
    if (value.trim().length < 2) {
      return 'Relationship must be at least 2 characters';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      return '';
    }
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) {
      return 'Phone should only contain numbers, spaces, and dashes';
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return 'Phone must be 7-15 digits';
    }
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Enter a valid email address';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: validateName(value) }));
  };

  const handleBirthdateChange = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    
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
    setErrors((prev) => ({ ...prev, birthdate: validateBirthdate(formatted) }));
  };

  const handleRelationshipChange = (value: string) => {
    setRelationship(value);
    setErrors((prev) => ({ ...prev, relationship: validateRelationship(value) }));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setErrors((prev) => ({ ...prev, phone: validatePhone(value) }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarImage(result.assets[0].uri);
    }
  };

  const pickIDDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIdDocument(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickMedicalDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setMedicalDocuments([...medicalDocuments, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeMedicalDocument = (index: number) => {
    setMedicalDocuments(medicalDocuments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const nameError = validateName(name);
    const birthdateError = validateBirthdate(birthdate);
    const relationshipError = validateRelationship(relationship);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);

    setErrors({
      name: nameError,
      birthdate: birthdateError,
      relationship: relationshipError,
      phone: phoneError,
      email: emailError,
    });

    if (nameError || birthdateError || relationshipError || phoneError || emailError) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    const birthYear = parseInt(birthdate.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age >= 18 && !idDocument) {
      Alert.alert('ID Required', 'Please upload a valid ID for members 18 years or older');
      return;
    }

    const updatedMember = {
      ...member,
      name,
      birthdate,
      age,
      gender,
      relationship,
      phone,
      email,
      avatarUrl: avatarImage,
      documents: {
        idDocument: idDocument,
        medicalDocuments: medicalDocuments,
      },
    };

    setFamilyMembers(familyMembers.map(m => m.id === memberId ? updatedMember : m));
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Name *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                errors.name && { borderColor: theme.colors.error },
              ]}
              placeholder="Enter name"
              placeholderTextColor={theme.colors.textTertiary}
              value={name}
              onChangeText={handleNameChange}
            />
            {errors.name ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Birthdate * (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                errors.birthdate && { borderColor: theme.colors.error },
              ]}
              placeholder="2000-01-01"
              placeholderTextColor={theme.colors.textTertiary}
              value={birthdate}
              onChangeText={handleBirthdateChange}
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.birthdate ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.birthdate}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Relationship *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                errors.relationship && { borderColor: theme.colors.error },
              ]}
              placeholder="e.g., Son, Daughter, Spouse"
              placeholderTextColor={theme.colors.textTertiary}
              value={relationship}
              onChangeText={handleRelationshipChange}
            />
            {errors.relationship ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.relationship}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Gender</Text>
            <View style={styles.genderButtons}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    gender === g && { borderColor: theme.colors.primary, backgroundColor: theme.colors.iconBackground },
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      { color: theme.colors.textSecondary },
                      gender === g && { color: theme.colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                errors.phone && { borderColor: theme.colors.error },
              ]}
              placeholder="555-1234"
              placeholderTextColor={theme.colors.textTertiary}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
            {errors.phone ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                errors.email && { borderColor: theme.colors.error },
              ]}
              placeholder="email@example.com"
              placeholderTextColor={theme.colors.textTertiary}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.email}</Text> : null}
          </View>

          {/* Avatar Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Profile Photo (Optional)</Text>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={pickAvatar}>
              {avatarImage ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: avatarImage }} style={styles.avatarPreview} />
                  <Text style={[styles.uploadText, { color: theme.colors.primary }]}>Change Photo</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                  <Text style={[styles.uploadText, { color: theme.colors.primary }]}>Upload Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ID Upload for 18+ */}
          {birthdate && (() => {
            const age = new Date().getFullYear() - parseInt(birthdate.split('-')[0]);
            return age >= 18;
          })() && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Valid ID * (Required for 18+)</Text>
              <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={pickIDDocument}>
                {idDocument ? (
                  <View style={styles.documentPreview}>
                    <Ionicons name="document-text" size={24} color="#15803d" />
                    <Text style={[styles.documentName, { color: theme.colors.text }]} numberOfLines={1}>
                      {idDocument.name}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  </View>
                ) : (
                  <>
                    <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
                    <Text style={[styles.uploadText, { color: theme.colors.primary }]}>Upload Valid ID</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Accepted: Driver's License, Passport, National ID</Text>
            </View>
          )}

          {/* Medical Documents */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Medical Documents (Optional)</Text>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={pickMedicalDocument}>
              <Ionicons name="document-attach-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.uploadText, { color: theme.colors.primary }]}>Add Medical Document</Text>
            </TouchableOpacity>
            {medicalDocuments.length > 0 && (
              <View style={styles.documentsList}>
                {medicalDocuments.map((doc, index) => (
                  <View key={index} style={[styles.documentItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.documentInfo}>
                      <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                      <Text style={[styles.documentItemName, { color: theme.colors.text }]} numberOfLines={1}>
                        {doc.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMedicalDocument(index)}>
                      <Ionicons name="close-circle" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Vaccination records, prescriptions, etc.</Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
              (errors.name || errors.birthdate || errors.relationship || errors.phone || errors.email || !name || !birthdate || !relationship) && { opacity: 0.5 },
            ]} 
            onPress={handleSubmit}
            disabled={!!(errors.name || errors.birthdate || errors.relationship || errors.phone || errors.email || !name || !birthdate || !relationship)}
          >
            <Text style={styles.submitButtonText}>Save Changes</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewContainer: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  documentsList: {
    marginTop: 12,
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  documentItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
