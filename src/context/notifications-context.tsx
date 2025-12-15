import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  addNotification: (notification: Omit<Notification, 'id' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markAsRead, unreadCount }}>
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
