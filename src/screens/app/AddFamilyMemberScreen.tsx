import React, { useState } from 'react';
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

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function AddFamilyMemberScreen({ navigation }: any) {
  const { familyMembers, setFamilyMembers } = useFamily();
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
  
  // Dropdown state
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    birthdate: '',
    relationship: '',
    phone: '',
    email: '',
  });

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
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      return ''; // Phone is optional
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
      return ''; // Email is optional
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
    // Auto-format with dashes as user types
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
    // Validate all fields
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

    // Check if there are any errors
    if (nameError || birthdateError || relationshipError || phoneError || emailError) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    const birthYear = parseInt(birthdate.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    // Check if ID is required for 18+
    if (age >= 18 && !idDocument) {
      Alert.alert('ID Required', 'Please upload a valid ID for members 18 years or older');
      return;
    }

    const newMember = {
      id: `member-${Date.now()}`,
      name,
      birthdate,
      age,
      gender,
      relationship,
      phone,
      email,
      isFullyVaccinated: false,
      nextDose: null,
      avatarUrl: avatarImage,
      vaccineHistory: [],
      documents: {
        idDocument: idDocument,
        medicalDocuments: medicalDocuments,
      },
    };

    setFamilyMembers([...familyMembers, newMember]);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter name"
              value={name}
              onChangeText={handleNameChange}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthdate * (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, errors.birthdate && styles.inputError]}
              placeholder="2000-01-01"
              value={birthdate}
              onChangeText={handleBirthdateChange}
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.birthdate ? <Text style={styles.errorText}>{errors.birthdate}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship *</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, errors.relationship && styles.inputError]}
              onPress={() => setShowRelationshipDropdown(!showRelationshipDropdown)}
            >
              <Text style={[styles.dropdownButtonText, !relationship && styles.dropdownPlaceholder]}>
                {relationship || 'Select relationship'}
              </Text>
              <Ionicons 
                name={showRelationshipDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
            
            {showRelationshipDropdown && (
              <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
                {['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandparent', 'Grandchild', 'Other'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.dropdownItem,
                      relationship === rel && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setRelationship(rel);
                      setErrors((prev) => ({ ...prev, relationship: '' }));
                      setShowRelationshipDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        relationship === rel && styles.dropdownItemTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                    {relationship === rel && (
                      <Ionicons name="checkmark" size={20} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {errors.relationship ? <Text style={styles.errorText}>{errors.relationship}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderButtons}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    gender === g && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === g && styles.genderButtonTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="555-1234"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="email@example.com"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Avatar Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Photo (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickAvatar}>
              {avatarImage ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: avatarImage }} style={styles.avatarPreview} />
                  <Text style={styles.uploadText}>Change Photo</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color="#6366f1" />
                  <Text style={styles.uploadText}>Upload Photo</Text>
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
              <Text style={styles.label}>Valid ID * (Required for 18+)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickIDDocument}>
                {idDocument ? (
                  <View style={styles.documentPreview}>
                    <Ionicons name="document-text" size={24} color="#15803d" />
                    <Text style={styles.documentName} numberOfLines={1}>
                      {idDocument.name}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  </View>
                ) : (
                  <>
                    <Ionicons name="card-outline" size={24} color="#6366f1" />
                    <Text style={styles.uploadText}>Upload Valid ID</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>Accepted: Driver's License, Passport, National ID</Text>
            </View>
          )}

          {/* Medical Documents */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical Documents (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickMedicalDocument}>
              <Ionicons name="document-attach-outline" size={24} color="#6366f1" />
              <Text style={styles.uploadText}>Add Medical Document</Text>
            </TouchableOpacity>
            {medicalDocuments.length > 0 && (
              <View style={styles.documentsList}>
                {medicalDocuments.map((doc, index) => (
                  <View key={index} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Ionicons name="document-text" size={20} color="#6366f1" />
                      <Text style={styles.documentItemName} numberOfLines={1}>
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
            <Text style={styles.helperText}>Vaccination records, prescriptions, etc.</Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (errors.name || errors.birthdate || errors.relationship || errors.phone || errors.email || !name || !birthdate || !relationship) && styles.submitButtonDisabled
            ]} 
            onPress={handleSubmit}
            disabled={!!(errors.name || errors.birthdate || errors.relationship || errors.phone || errors.email || !name || !birthdate || !relationship)}
          >
            <Text style={styles.submitButtonText}>Add Family Member</Text>
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
  dropdownButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#6366f1',
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
