import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FamilyProvider } from './src/context/family-context';
import { ThemeProvider, useTheme } from './src/context/theme-context';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { NotificationsProvider } from './src/context/notifications-context';
import { AppointmentsProvider } from './src/context/appointments-context';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import CreateAccountScreen from './src/screens/auth/CreateAccountScreen';

// Patient Screens
import DashboardScreen from './src/screens/app/DashboardScreen';
import FamilyScreen from './src/screens/app/FamilyScreen';
import VaccinationsScreen from './src/screens/app/VaccinationsScreen';
import CalendarScreen from './src/screens/app/CalendarScreen';
import SettingsScreen from './src/screens/app/SettingsScreen';
import NotificationsScreen from './src/screens/app/NotificationsScreen';
import AddFamilyMemberScreen from './src/screens/app/AddFamilyMemberScreen';
import MemberProfileScreen from './src/screens/app/MemberProfileScreen';
import EditMemberScreen from './src/screens/app/EditMemberScreen';
import EditProfileScreen from './src/screens/app/EditProfileScreen';

// Staff Screens
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import StaffProfileScreen from './src/screens/staff/StaffProfileScreen';
import PatientManagementScreen from './src/screens/staff/PatientManagementScreen';
import AppointmentSchedulingScreen from './src/screens/staff/AppointmentSchedulingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Calculate proper header height for Android
const HEADER_HEIGHT = Platform.OS === 'android' ? 56 : 44;

function MainTabs() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // Show different tabs based on user role
  if (user?.role === 'staff') {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'StaffDashboard') {
              iconName = focused ? 'medical' : 'medical-outline';
            } else if (route.name === 'PatientManagement') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Appointments') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="StaffDashboard" 
          component={StaffDashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Tab.Screen 
          name="PatientManagement" 
          component={PatientManagementScreen}
          options={{ title: 'Patients' }}
        />
        <Tab.Screen 
          name="Appointments" 
          component={AppointmentSchedulingScreen}
          options={{ title: 'Appointments' }}
        />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    );
  }
  
  // Patient tabs (default)
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Family') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Vaccinations') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="Vaccinations" component={VaccinationsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppointmentsProvider>
            <FamilyProvider>
              <AppNavigator />
            </FamilyProvider>
          </AppointmentsProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  
  return (
    <NavigationContainer>
      <StatusBar 
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.card}
        translucent={false}
      />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: theme.colors.text,
          },
          headerShadowVisible: true,
          headerBackTitleVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CreateAccount" 
          component={CreateAccountScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Main" 
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddFamilyMember" 
          component={AddFamilyMemberScreen}
          options={{ 
            title: 'Add Family Member',
          }}
        />
        <Stack.Screen 
          name="MemberProfile" 
          component={MemberProfileScreen}
          options={{ 
            title: 'Member Profile',
          }}
        />
        <Stack.Screen 
          name="EditMember" 
          component={EditMemberScreen}
          options={{ 
            title: 'Edit Member',
          }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{ 
            title: 'Notifications',
          }}
        />
        <Stack.Screen 
          name="StaffProfile" 
          component={StaffProfileScreen}
          options={{ 
            title: 'My Profile',
          }}
        />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen}
          options={{ 
            title: 'Edit Profile',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
