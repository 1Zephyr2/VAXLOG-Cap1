import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { type FamilyMember } from '../lib/data';
import { useAuth } from './auth-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

type FamilyContextType = {
  familyMembers: FamilyMember[];
  setFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  clearFamilyMembers: () => void;
  loadFamilyMembers: () => Promise<void>;
};

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  // Start with empty array - no hardcoded data!
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const { user } = useAuth();

  // Load family members from Firestore when user logs in
  const loadFamilyMembers = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      const members: FamilyMember[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Replace old pravatar or iran.liara URLs with reliable avatar
        let avatarUrl = data.avatarUrl;
        if (avatarUrl && (avatarUrl.includes('pravatar.cc') || avatarUrl.includes('iran.liara.run'))) {
          avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=6366f1`;
        }
        
        members.push({
          id: doc.id,
          ...data,
          avatarUrl,
        } as FamilyMember);
      });
      
      // Sort: Account owner first (relationship === 'Me'), then by age (oldest to youngest)
      members.sort((a, b) => {
        // Account owner always first
        if (a.relationship === 'Me' && b.relationship !== 'Me') return -1;
        if (b.relationship === 'Me' && a.relationship !== 'Me') return 1;
        
        // Then sort by age (oldest to youngest)
        return b.age - a.age;
      });
      
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  // Load family members when user logs in
  useEffect(() => {
    if (user) {
      loadFamilyMembers();
    } else {
      setFamilyMembers([]);
    }
  }, [user]);

  const clearFamilyMembers = () => {
    setFamilyMembers([]);
  };

  return (
    <FamilyContext.Provider value={{ familyMembers, setFamilyMembers, clearFamilyMembers, loadFamilyMembers }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
