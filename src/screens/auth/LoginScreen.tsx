import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../context/family-context';
import { useAuth, UserRole } from '../../context/auth-context';
import { PlaceHolderImages } from '../../lib/placeholder-images';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function LoginScreen({ navigation }: any) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [email, setEmail] = useState('jessica@example.com');
  const [password, setPassword] = useState('password');
  const { setFamilyMembers } = useFamily();
  const { login } = useAuth();

  const [errors, setErrors] = useState({ email: '', password: '' });

  // Update email when role changes
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'staff') {
      setEmail('dr.sarah@hospital.com');
    } else {
      setEmail('jessica@example.com');
    }
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

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
  };

  const handleLogin = () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) {
      return;
    }
    
    // Authenticate user with selected role
    const success = login(email, password, selectedRole);
    
    if (!success) {
      setErrors({ email: 'Invalid credentials', password: '' });
      return;
    }
    
    // Only load family data for patient role
    if (selectedRole === 'patient') {
      const { familyMembers: sampleFamily } = require('../../lib/data');
      // Family data already includes Jessica Doe as the account owner
      // No need to add her again
      setFamilyMembers(sampleFamily);
    }
    
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.logo}>VAXLOG</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your credentials to access your account.</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>I am a</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'patient' && styles.roleButtonActive,
                  ]}
                  onPress={() => handleRoleChange('patient')}
                >
                  <Ionicons 
                    name="person" 
                    size={24} 
                    color={selectedRole === 'patient' ? '#6366f1' : '#6b7280'} 
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === 'patient' && styles.roleButtonTextActive,
                    ]}
                  >
                    Patient
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'staff' && styles.roleButtonActive,
                  ]}
                  onPress={() => handleRoleChange('staff')}
                >
                  <Ionicons 
                    name="medical" 
                    size={24} 
                    color={selectedRole === 'staff' ? '#6366f1' : '#6b7280'} 
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === 'staff' && styles.roleButtonTextActive,
                    ]}
                  >
                    Healthcare Staff
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

            <TouchableOpacity 
              style={[styles.button, (errors.email || errors.password || !email || !password) && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={!!(errors.email || errors.password || !email || !password)}
            >
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text
                style={styles.link}
                onPress={() => navigation.navigate('CreateAccount')}
              >
                Create Account
              </Text>
            </Text>
          </View>
        </View>
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
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#d1fae5',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  roleButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  roleButtonTextActive: {
    color: '#10b981',
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
});
