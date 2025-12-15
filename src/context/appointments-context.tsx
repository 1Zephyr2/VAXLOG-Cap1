import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  vaccine: string;
  time: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

type AppointmentsContextType = {
  appointments: Appointment[];
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => void;
  cancelAppointment: (appointmentId: string) => void;
  completeAppointment: (appointmentId: string) => void;
};

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export const AppointmentsProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientId: 'user-julian',
      patientName: 'Julian Doe',
      vaccine: 'MMR Dose 2',
      time: '09:00 AM',
      date: new Date().toISOString().split('T')[0],
      status: 'scheduled',
    },
    {
      id: '2',
      patientId: 'user-elena',
      patientName: 'Elena Doe',
      vaccine: 'DTaP Dose 4',
      time: '10:30 AM',
      date: new Date().toISOString().split('T')[0],
      status: 'scheduled',
    },
    {
      id: '3',
      patientId: 'user-ryan',
      patientName: 'Ryan Doe',
      vaccine: 'Hepatitis B',
      time: '02:00 PM',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'scheduled',
    },
  ]);

  const addAppointment = (appointment: Appointment) => {
    setAppointments([...appointments, appointment]);
  };

  const updateAppointment = (appointmentId: string, updates: Partial<Appointment>) => {
    setAppointments(
      appointments.map(apt =>
        apt.id === appointmentId ? { ...apt, ...updates } : apt
      )
    );
  };

  const cancelAppointment = (appointmentId: string) => {
    setAppointments(appointments.filter(apt => apt.id !== appointmentId));
  };

  const completeAppointment = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'completed' });
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        addAppointment,
        updateAppointment,
        cancelAppointment,
        completeAppointment,
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
