import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export type UserRole = 'patient' | 'staff';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  gender?: string;
  familyRole?: string;
  phone?: string;
  birthdate?: string;
  age?: number;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole, gender: string, familyRole?: string, phone?: string, birthdate?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch additional data from Firestore
        await loadUserData(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userName = userData.name || firebaseUser.displayName || 'User';
        
        // Replace old pravatar URLs with new silhouette
        let avatarUrl = userData.avatarUrl || firebaseUser.photoURL;
        if (avatarUrl && avatarUrl.includes('pravatar.cc')) {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=300&background=6366f1&color=fff`;
        }
        
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userName,
          role: userData.role || 'patient',
          gender: userData.gender,
          familyRole: userData.familyRole,
          phone: userData.phone,
          birthdate: userData.birthdate,
          age: userData.age,
          avatarUrl: avatarUrl || undefined,
        });
      } else {
        // Fallback if Firestore document doesn't exist
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || 'User',
          role: 'patient',
          avatarUrl: firebaseUser.photoURL || undefined,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(null);
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole, gender: string, familyRole?: string, phone?: string, birthdate?: string) => {
    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, { displayName: name });

      // Calculate age if birthdate provided
      let age: number | undefined;
      if (birthdate) {
        const birthDate = new Date(birthdate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        email,
        role,
        gender,
        familyRole: familyRole || null,
        phone: phone || null,
        birthdate: birthdate || null,
        age: age || null,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=6366f1&color=fff`,
      });

      // Update local user state
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name,
        role,
        gender,
        familyRole,
        phone,
        birthdate,
        age,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=6366f1&color=fff`,
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(userCredential.user);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Failed to login');
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user || !auth.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      // Update Firestore document
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, updates, { merge: true });

      // If name is updated, also update Firebase Auth displayName
      if (updates.name) {
        await updateProfile(auth.currentUser, { displayName: updates.name });
      }

      // Update local state
      setUser({ ...user, ...updates });
    } catch (error: any) {
      console.error('Update user error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
