import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/context/auth-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function CreateAccountScreen({ navigation }: any) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [familyRole, setFamilyRole] = useState('');
  const [role, setRole] = useState<'patient' | 'staff'>('patient');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthdate: '',
    gender: '',
    familyRole: '',
  });

  const validateName = (value: string) => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Enter a valid email address';
    }
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      return 'Please confirm your password';
    }
    if (value !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      return 'Phone number is required';
    }
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    if (digits[0] !== '9') {
      return 'Philippine mobile numbers start with 9';
    }
    return '';
  };

  const validateBirthdate = (value: string) => {
    if (!value.trim()) {
      return 'Birthdate is required';
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return 'Format: YYYY-MM-DD';
    }
    const date = new Date(value);
    const today = new Date();
    if (date > today) {
      return 'Birthdate cannot be in the future';
    }
    return '';
  };

  const validateGender = (value: string) => {
    if (!value) {
      return 'Gender is required';
    }
    return '';
  };

  const validateFamilyRole = (value: string, role: string) => {
    if (role === 'patient' && !value) {
      return 'Family role is required';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: validateName(value) }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    // Re-validate confirm password if it's already filled
    if (confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: value !== confirmPassword ? 'Passwords do not match' : '' }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(value) }));
  };

  const handlePhoneChange = (value: string) => {
    // Only accept numbers
    const numericOnly = value.replace(/[^0-9]/g, '');
    setPhone(numericOnly);
    setErrors((prev) => ({ ...prev, phone: validatePhone(numericOnly) }));
  };

  const handleBirthdateChange = (value: string) => {
    // Allow only numbers and dashes, auto-format
    let formatted = value.replace(/[^0-9-]/g, '');
    
    // Auto-add dashes for YYYY-MM-DD format
    if (formatted.length >= 4 && formatted[4] !== '-') {
      formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
    }
    if (formatted.length >= 7 && formatted[7] !== '-') {
      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
    }
    
    formatted = formatted.slice(0, 10); // Limit to YYYY-MM-DD length
    setBirthdate(formatted);
    setErrors((prev) => ({ ...prev, birthdate: validateBirthdate(formatted) }));
  };

  const handleCreateAccount = async () => {
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    const phoneError = validatePhone(phone);
    const birthdateError = validateBirthdate(birthdate);
    const genderError = validateGender(gender);
    const familyRoleError = validateFamilyRole(familyRole, role);

    setErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      phone: phoneError,
      birthdate: birthdateError,
      gender: genderError,
      familyRole: familyRoleError,
    });

    if (nameError || emailError || passwordError || confirmPasswordError || phoneError || birthdateError || genderError || familyRoleError) {
      return;
    }

    setLoading(true);
    try {
      // Create account with Firebase with selected role, gender, familyRole, phone, and birthdate
      await signup(email, password, name, role, gender, role === 'patient' ? familyRole : undefined, phone, birthdate);
      // Account created successfully - user is automatically logged in
      // No need to navigate, the auth state change will handle it
    } catch (error: any) {
      let errorMessage = 'Failed to create account. Please try again.';
      
      // Handle specific Firebase errors
      if (error.message.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (error.message.includes('weak-password')) {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address format.';
      } else if (error.message.includes('network-request-failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.logo}>VAXLOG</Text>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join us to track your family's vaccinations.</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="John Doe"
                  value={name}
                  onChangeText={handleNameChange}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account Type</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'patient' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('patient')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'patient' && styles.roleButtonTextActive,
                      ]}
                    >
                      Patient
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'staff' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('staff')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'staff' && styles.roleButtonTextActive,
                      ]}
                    >
                      Doctor/Staff
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="m@example.com"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.phonePrefix}>+63</Text>
                  <TextInput
                    style={[styles.phoneInput, errors.phone && styles.inputError]}
                    placeholder="9XX XXX XXXX"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="numeric"
                    maxLength={11}
                  />
                </View>
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birthdate</Text>
                <TextInput
                  style={[styles.input, errors.birthdate && styles.inputError]}
                  placeholder="YYYY-MM-DD (e.g., 1990-05-15)"
                  value={birthdate}
                  onChangeText={handleBirthdateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
                {errors.birthdate ? <Text style={styles.errorText}>{errors.birthdate}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      gender === 'Male' && styles.roleButtonActive,
                    ]}
                    onPress={() => setGender('Male')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        gender === 'Male' && styles.roleButtonTextActive,
                      ]}
                    >
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      gender === 'Female' && styles.roleButtonActive,
                    ]}
                    onPress={() => setGender('Female')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        gender === 'Female' && styles.roleButtonTextActive,
                      ]}
                    >
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
              </View>

              {role === 'patient' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Role</Text>
                  <View style={styles.familyRoleButtons}>
                    <TouchableOpacity
                      style={[
                        styles.familyRoleButton,
                        familyRole === 'Father' && styles.roleButtonActive,
                      ]}
                      onPress={() => setFamilyRole('Father')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          familyRole === 'Father' && styles.roleButtonTextActive,
                        ]}
                      >
                        Father
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.familyRoleButton,
                        familyRole === 'Mother' && styles.roleButtonActive,
                      ]}
                      onPress={() => setFamilyRole('Mother')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          familyRole === 'Mother' && styles.roleButtonTextActive,
                        ]}
                      >
                        Mother
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.familyRoleButton,
                        familyRole === 'Guardian' && styles.roleButtonActive,
                      ]}
                      onPress={() => setFamilyRole('Guardian')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          familyRole === 'Guardian' && styles.roleButtonTextActive,
                        ]}
                      >
                        Guardian
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.familyRoleButton,
                        familyRole === 'Individual' && styles.roleButtonActive,
                      ]}
                      onPress={() => setFamilyRole('Individual')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          familyRole === 'Individual' && styles.roleButtonTextActive,
                        ]}
                      >
                        Individual
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {errors.familyRole ? <Text style={styles.errorText}>{errors.familyRole}</Text> : null}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                />
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry
                />
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity 
                style={[styles.button, (loading || errors.name || errors.email || errors.phone || errors.birthdate || errors.gender || errors.familyRole || errors.password || errors.confirmPassword || !name || !email || !phone || !birthdate || !gender || (role === 'patient' && !familyRole) || !password || !confirmPassword) && styles.buttonDisabled]} 
                onPress={handleCreateAccount}
                disabled={loading || !!(errors.name || errors.email || errors.phone || errors.birthdate || errors.gender || errors.familyRole || errors.password || errors.confirmPassword || !name || !email || !phone || !birthdate || !gender || (role === 'patient' && !familyRole) || !password || !confirmPassword)}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Login')}
                >
                  Log In
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#065f46',
  },
  subtitle: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
  },
  content: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#065f46',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#065f46',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#065f46',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a7f3d0',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#059669',
  },
  link: {
    color: '#10b981',
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  roleButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  roleButtonTextActive: {
    color: '#10b981',
  },
  familyRoleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  familyRoleButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#d1fae5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
