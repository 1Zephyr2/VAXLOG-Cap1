import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './auth-context';
import { FamilyMember } from '../lib/data';

type StaffPatientsContextType = {
  staffPatients: FamilyMember[];
  setStaffPatients: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  addStaffPatient: (patient: Omit<FamilyMember, 'id'>) => Promise<string>;
  updateStaffPatient: (patientId: string, updates: Partial<FamilyMember>) => Promise<void>;
  deleteStaffPatient: (patientId: string) => Promise<void>;
  loadStaffPatients: () => Promise<void>;
};

const StaffPatientsContext = createContext<StaffPatientsContextType | undefined>(undefined);

export const StaffPatientsProvider = ({ children }: { children: ReactNode }) => {
  const [staffPatients, setStaffPatients] = useState<FamilyMember[]>([]);
  const { user } = useAuth();

  // Load staff patients from Firestore when user logs in
  const loadStaffPatients = async () => {
    if (!user || user.role !== 'staff') return;

    try {
      const q = query(
        collection(db, 'staffPatients'),
        where('staffId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      const patients: FamilyMember[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        patients.push({
          id: doc.id,
          ...data,
        } as FamilyMember);
      });
      
      // Sort by createdAt desc (newest first)
      patients.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      
      setStaffPatients(patients);
    } catch (error) {
      console.error('Error loading staff patients:', error);
    }
  };

  // Load patients when staff logs in, clear when logs out
  useEffect(() => {
    if (user && user.role === 'staff') {
      loadStaffPatients();
    } else {
      setStaffPatients([]);
    }
  }, [user]);

  const addStaffPatient = async (patient: Omit<FamilyMember, 'id'>): Promise<string> => {
    if (!user || user.role !== 'staff') {
      throw new Error('Only staff can add patients');
    }

    try {
      const patientData = {
        ...patient,
        staffId: user.id,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'staffPatients'), patientData);
      
      const newPatient = {
        ...patient,
        id: docRef.id,
      };

      setStaffPatients([...staffPatients, newPatient]);
      return docRef.id;
    } catch (error) {
      console.error('Error adding staff patient:', error);
      throw error;
    }
  };

  const updateStaffPatient = async (patientId: string, updates: Partial<FamilyMember>) => {
    if (!user || user.role !== 'staff') {
      throw new Error('Only staff can update patients');
    }

    try {
      await updateDoc(doc(db, 'staffPatients', patientId), updates);
      
      setStaffPatients(
        staffPatients.map(patient =>
          patient.id === patientId ? { ...patient, ...updates } : patient
        )
      );
    } catch (error) {
      console.error('Error updating staff patient:', error);
      throw error;
    }
  };

  const deleteStaffPatient = async (patientId: string) => {
    if (!user || user.role !== 'staff') {
      throw new Error('Only staff can delete patients');
    }

    try {
      await deleteDoc(doc(db, 'staffPatients', patientId));
      setStaffPatients(staffPatients.filter(patient => patient.id !== patientId));
    } catch (error) {
      console.error('Error deleting staff patient:', error);
      throw error;
    }
  };

  return (
    <StaffPatientsContext.Provider
      value={{
        staffPatients,
        setStaffPatients,
        addStaffPatient,
        updateStaffPatient,
        deleteStaffPatient,
        loadStaffPatients,
      }}
    >
      {children}
    </StaffPatientsContext.Provider>
  );
};

export const useStaffPatients = () => {
  const context = useContext(StaffPatientsContext);
  if (context === undefined) {
    throw new Error('useStaffPatients must be used within a StaffPatientsProvider');
  }
  return context;
};
