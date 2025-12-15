import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './auth-context';

export type Notification = {
  id: string;
  memberName: string;
  message: string;
  date: string;
  type: 'Upcoming' | 'Reminder' | 'Info';
  isRead: boolean;
};

type NotificationsContextType = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'isRead'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  unreadCount: number;
  loadNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // Load notifications from Firestore when user logs in
  const loadNotifications = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      const loadedNotifications: Notification[] = [];
      
      querySnapshot.forEach((doc) => {
        loadedNotifications.push({
          id: doc.id,
          ...doc.data(),
        } as Notification);
      });
      
      // Sort by createdAt desc (newest first)
      loadedNotifications.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      
      setNotifications(loadedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Load notifications when user logs in, clear when logs out
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  const addNotification = async (notification: Omit<Notification, 'id' | 'isRead'>) => {
    if (!user) {
      throw new Error('User must be logged in to add notifications');
    }

    try {
      const notificationData = {
        ...notification,
        userId: user.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      const newNotification: Notification = {
        ...notification,
        id: docRef.id,
        isRead: false,
      };

      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      
      setNotifications(prev =>
        prev.map(notif => (notif.id === id ? { ...notif, isRead: true } : notif))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'notifications', id));
      
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      // Delete all notifications for this user from Firebase
      const deletePromises = notifications.map(notif => 
        deleteDoc(doc(db, 'notifications', notif.id))
      );
      await Promise.all(deletePromises);
      
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markAsRead, deleteNotification, clearAllNotifications, unreadCount, loadNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
