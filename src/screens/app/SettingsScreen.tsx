import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../context/auth-context';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;

export default function SettingsScreen({ navigation }: any) {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { logout } = useAuth();
  const [darkModeEnabled, setDarkModeEnabled] = useState(themeMode === 'dark');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const toggleDarkMode = (value: boolean) => {
    setDarkModeEnabled(value);
    setThemeMode(value ? 'dark' : 'light');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const settingsOptions = [
    {
      id: 'appearance',
      title: 'Appearance',
      items: [
        {
          icon: isDark ? 'moon' : 'sunny',
          label: 'Dark Mode',
          onPress: () => {},
          showChevron: false,
          showSwitch: true,
        },
      ],
    },
    {
      id: 'about',
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'About VaxLog',
          onPress: () => setActiveModal('about'),
          showChevron: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          onPress: () => setActiveModal('privacy'),
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Terms of Service',
          onPress: () => setActiveModal('terms'),
          showChevron: true,
        },
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          onPress: () => setActiveModal('help'),
          showChevron: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.colors.statusBar} backgroundColor={theme.colors.card} />
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Settings Sections */}
        {settingsOptions.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {section.items.map((item: any, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.settingItem,
                    index !== section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  disabled={item.showSwitch}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                      <Ionicons name={item.icon as any} size={22} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{item.label}</Text>
                  </View>
                  {item.showChevron && (
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  )}
                  {item.showSwitch && (
                    <Switch
                      value={darkModeEnabled}
                      onValueChange={toggleDarkMode}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      thumbColor={darkModeEnabled ? theme.colors.card : '#f4f3f4'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.errorLight }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
            <Text style={[styles.logoutText, { color: theme.colors.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.colors.textTertiary }]}>VaxLog Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Modal for Information Pages */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {activeModal === 'about' && 'About VaxLog'}
              {activeModal === 'privacy' && 'Privacy Policy'}
              {activeModal === 'terms' && 'Terms of Service'}
              {activeModal === 'help' && 'Help & Support'}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {activeModal === 'about' && (
              <View style={styles.contentContainer}>
                <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="information-circle" size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
                  <Text style={[styles.contentTitle, { color: theme.colors.text }]}>VaxLog</Text>
                  <Text style={[styles.contentSubtitle, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
                </View>

                <View style={[styles.contentSection, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>About VaxLog</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    VaxLog is a comprehensive vaccination management application designed to help individuals and healthcare providers track, manage, and maintain accurate vaccination records.
                  </Text>

                  <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 16 }]}>Key Features</Text>
                  <View style={styles.featureList}>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Track vaccination history for you and your family members</Text>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Schedule and manage upcoming vaccination appointments</Text>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Receive reminders for due vaccinations</Text>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Access vaccination records anytime, anywhere</Text>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Healthcare staff tools for patient management</Text>
                    <Text style={[styles.featureItem, { color: theme.colors.text }]}>• Real-time vaccination analytics and reporting</Text>
                  </View>

                  <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 16 }]}>Our Mission</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    To make vaccination management simple, accessible, and secure for everyone. We believe proper vaccination records are essential for public health and individual wellbeing.
                  </Text>
                </View>
              </View>
            )}

            {activeModal === 'privacy' && (
              <View style={styles.contentContainer}>
                <View style={[styles.contentSection, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Privacy Policy</Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>1. Data Collection</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    VaxLog collects personal health information including vaccination records, medical history, and family member details. This information is essential for providing accurate vaccination tracking and management services.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>2. Data Protection</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Your data is encrypted and stored securely. We implement industry-standard security measures to protect your personal and health information from unauthorized access.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>3. Data Usage</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Your vaccination data is used to:\n• Generate vaccination history records\n• Calculate vaccination schedules\n• Send vaccination reminders\n• Provide analytics to healthcare providers\n• Improve app functionality
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>4. Third-Party Sharing</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    We do not sell or share your personal health information with third parties without your explicit consent, except as required by law or to fulfill our service obligations.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>5. Your Rights</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    You have the right to:\n• Access your personal data\n• Request data corrections\n• Delete your account and associated data\n• Export your vaccination records\n• Opt-out of non-essential communications
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>6. Contact Us</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    For privacy-related questions or concerns, please contact: privacy@vaxlog.app
                  </Text>
                </View>
              </View>
            )}

            {activeModal === 'terms' && (
              <View style={styles.contentContainer}>
                <View style={[styles.contentSection, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Terms of Service</Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>1. Acceptance of Terms</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    By using VaxLog, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the application.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>2. User Accounts</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    You are responsible for maintaining the confidentiality of your login credentials. You agree to use the application only for lawful purposes and in compliance with all applicable laws.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>3. Medical Disclaimer</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    VaxLog is designed to manage vaccination records and schedules. It is not a substitute for professional medical advice. Always consult with qualified healthcare providers for medical decisions.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>4. User Responsibilities</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Users must:\n• Provide accurate and complete information\n• Update records when vaccination status changes\n• Report any unauthorized access to accounts\n• Follow all applicable health regulations
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>5. Limitation of Liability</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    VaxLog is provided "as-is" without warranties. We are not liable for damages resulting from service interruptions, data loss, or reliance on vaccination information.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>6. Changes to Terms</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    We may update these terms at any time. Continued use of VaxLog signifies acceptance of updated terms.
                  </Text>
                </View>
              </View>
            )}

            {activeModal === 'help' && (
              <View style={styles.contentContainer}>
                <View style={[styles.contentSection, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Help & Support</Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Getting Started</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    1. Create your account and set up your profile\n2. Add family members to your account\n3. View your vaccination history\n4. Schedule upcoming vaccinations\n5. Enable notifications for reminders
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Managing Your Account</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    • Edit Profile: Update your personal information\n• Manage Family: Add or remove family members\n• View History: Access all vaccination records\n• Settings: Configure preferences and notifications
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Vaccination Records</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Your vaccination history shows all completed and upcoming vaccinations. Records include dates, vaccine names, dosages, and healthcare provider information. You can export these records anytime.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Scheduling Appointments</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Healthcare staff can schedule appointments for you. Once scheduled, you'll receive notifications. You can view appointment details in your upcoming vaccinations section.
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Common Issues</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    Not receiving reminders?\n• Check notification settings are enabled\n• Verify your contact information is correct\n\nCannot see family members?\n• Ensure members were added correctly\n• Refresh your vaccination records\n\nNeed to update records?\n• Contact your healthcare provider
                  </Text>

                  <Text style={[styles.subsectionHeading, { color: theme.colors.textSecondary }]}>Contact Support</Text>
                  <Text style={[styles.contentText, { color: theme.colors.text }]}>
                    For additional assistance:\n• Email: support@vaxlog.app\n• In-app support chat available 9 AM - 5 PM weekdays\n• FAQ section in settings\n\nResponse time: Usually within 24 hours
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
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
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  contentCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  contentSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  subsectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
});
