import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  familyMembers as initialFamilyMembers,
  type FamilyMember,
} from '../lib/data';

type FamilyContextType = {
  familyMembers: FamilyMember[];
  setFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
};

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const [familyMembers, setFamilyMembers] =
    useState<FamilyMember[]>(initialFamilyMembers);

  return (
    <FamilyContext.Provider value={{ familyMembers, setFamilyMembers }}>
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
