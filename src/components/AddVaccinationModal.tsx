import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

interface AddVaccinationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (vaccination: VaccinationRecord) => void;
  patientName: string;
}

export interface VaccinationRecord {
  vaccineName: string;
  dateAdministered: string;
  nextDoseDate: string;
  notes: string;
}

export default function AddVaccinationModal({ visible, onClose, onSave, patientName }: AddVaccinationModalProps) {
  const { theme } = useTheme();
  const [vaccineName, setVaccineName] = useState('');
  const [dateAdministered, setDateAdministered] = useState('');
  const [nextDoseDate, setNextDoseDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!vaccineName || !dateAdministered) {
      alert('Please fill in vaccine name and date administered');
      return;
    }

    onSave({
      vaccineName,
      dateAdministered,
      nextDoseDate,
      notes,
    });

    // Reset form
    setVaccineName('');
    setDateAdministered('');
    setNextDoseDate('');
    setNotes('');
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setVaccineName('');
    setDateAdministered('');
    setNextDoseDate('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add Vaccination</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Patient Name Display */}
            <View style={[styles.patientBanner, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="person-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.patientName, { color: theme.colors.text }]}>{patientName}</Text>
            </View>

            {/* Vaccine Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Vaccine Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.card, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                placeholder="e.g., COVID-19, Influenza, Measles"
                placeholderTextColor={theme.colors.textTertiary}
                value={vaccineName}
                onChangeText={setVaccineName}
              />
            </View>

            {/* Date Administered */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Date Administered <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateInputContainer}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.dateInput, { 
                    backgroundColor: theme.colors.card, 
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={dateAdministered}
                  onChangeText={setDateAdministered}
                />
              </View>
            </View>

            {/* Next Dose Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Next Dose Date (Optional)
              </Text>
              <View style={styles.dateInputContainer}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.dateInput, { 
                    backgroundColor: theme.colors.card, 
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="YYYY-MM-DD (e.g., 2024-03-15)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={nextDoseDate}
                  onChangeText={setNextDoseDate}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.card, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                placeholder="Additional notes, side effects, etc."
                placeholderTextColor={theme.colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Vaccination</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
