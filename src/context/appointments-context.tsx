import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './auth-context';

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  appointmentType: 'vaccination' | 'checkup';
  vaccine?: string;
  reasonForCheckup?: string;
  time?: string;
  date?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  bookedByStaff?: boolean;
  userId?: string;
  staffId?: string;
  staffName?: string;
  familyOwnerName?: string; // Name of the family account owner
  familyOwnerEmail?: string; // Email of the family account owner
  familyMemberRelationship?: string; // Relationship to family owner (e.g., 'Me', 'Son', 'Daughter')
};

type AppointmentsContextType = {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  completeAppointment: (appointmentId: string) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  loadAppointments: () => Promise<void>;
};

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export const AppointmentsProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { user } = useAuth();

  // Load appointments from Firestore when user logs in
  const loadAppointments = async () => {
    if (!user) return;

    try {
      let loadedAppointments: Appointment[] = [];

      // For staff users, load appointments where they are assigned as staff
      if (user.role === 'staff') {
        const staffQuery = query(
          collection(db, 'appointments'),
          where('staffId', '==', user.id)
        );
        
        const staffSnapshot = await getDocs(staffQuery);
        staffSnapshot.forEach((doc) => {
          loadedAppointments.push({
            id: doc.id,
            ...doc.data(),
          } as Appointment);
        });
      }

      // For patient users (or staff viewing their own appointments), load their appointments
      const userQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.id)
      );
      
      const userSnapshot = await getDocs(userQuery);
      userSnapshot.forEach((doc) => {
        const appointment = {
          id: doc.id,
          ...doc.data(),
        } as Appointment;
        
        // Avoid duplicates if staff also created appointments as a patient
        if (!loadedAppointments.find(apt => apt.id === appointment.id)) {
          loadedAppointments.push(appointment);
        }
      });
      
      // Sort by date ascending (earliest first)
      loadedAppointments.sort((a, b) => {
        return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
      });
      
      setAppointments(loadedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  // Load appointments when user logs in, clear when logs out
  useEffect(() => {
    if (user) {
      loadAppointments();
    } else {
      setAppointments([]);
    }
  }, [user]);

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    if (!user) {
      throw new Error('User must be logged in to add appointments');
    }

    try {
      const appointmentData = {
        ...appointment,
        userId: user.id,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
      
      setAppointments([...appointments, {
        ...appointment,
        id: docRef.id,
      }]);
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  };

  const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    if (!user) {
      throw new Error('User must be logged in to update appointments');
    }

    try {
      await updateDoc(doc(db, 'appointments', appointmentId), updates);
      
      setAppointments(
        appointments.map(apt =>
          apt.id === appointmentId ? { ...apt, ...updates } : apt
        )
      );
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    if (!user) {
      throw new Error('User must be logged in to cancel appointments');
    }

    try {
      await updateDoc(doc(db, 'appointments', appointmentId), { status: 'cancelled' });
      setAppointments(
        appointments.map(apt =>
          apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
        )
      );
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  };

  const completeAppointment = async (appointmentId: string) => {
    await updateAppointment(appointmentId, { status: 'completed' });
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!user) {
      throw new Error('User must be logged in to delete appointments');
    }

    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
      setAppointments(
        appointments.filter(apt => apt.id !== appointmentId)
      );
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        addAppointment,
        updateAppointment,
        cancelAppointment,
        completeAppointment,
        deleteAppointment,
        loadAppointments,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentsContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentsProvider');
  }
  return context;
};
