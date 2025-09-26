import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { DatabaseProvider } from './src/components/DatabaseProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { authService } from './src/services/authService';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TestScreen from './src/screens/TestScreen';


import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import { LecturerDashboardScreen } from './src/screens/LecturerDashboardScreen';
import StudentDashboardScreen from './src/screens/StudentDashboardScreen';

// Bottom Navigation Component
type RouteName = 'Landing'|'Login'|'Register'|'Admin'|'Lecturer'|'Student'|'Test'|'LogoutTest';
function BottomNav({ onNavigate }: { onNavigate: (r: RouteName) => void }){
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 12, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
      <Text onPress={() => onNavigate('Admin')} style={{ fontWeight: '700' }}>Admin</Text>
      <Text onPress={() => onNavigate('Lecturer')} style={{ fontWeight: '700' }}>Lecturer</Text>
      <Text onPress={() => onNavigate('Student')} style={{ fontWeight: '700' }}>Student</Text>
    </View>
  );
}

// Minimal, dependency-free navigator to switch between routes
export default function App() {
  const [route, setRoute] = useState<'Landing' | 'Login' | 'Register' | 'Admin' | 'Lecturer' | 'Student' | 'Test' | 'LogoutTest'>('Landing');

  // Provide a small navigation object compatible with our screens
  const navigation = useMemo(
    () => ({
      navigate: (next: 'Landing' | 'Login' | 'Register' | 'Admin' | 'Lecturer' | 'Student' | 'Test' | 'LogoutTest') => {
        // Role guards for dashboards
        if (next === 'Admin' || next === 'Lecturer' || next === 'Student') {
          const current = authService.getCurrentUser();
          const isAuthed = authService.isAuthenticated();
          if (!isAuthed || !current) {
            Alert.alert('Not Authenticated', 'Please log in to continue.');
            setRoute('Login');
            return;
          }
          if (
            (next === 'Admin' && current.role !== 'admin') ||
            (next === 'Lecturer' && current.role !== 'lecturer') ||
            (next === 'Student' && current.role !== 'student')
          ) {
            Alert.alert('Access Denied', 'You do not have permission to access this dashboard.');
            // Route to correct dashboard for current user
            const target = current.role === 'admin' ? 'Admin' : current.role === 'lecturer' ? 'Lecturer' : 'Student';
            setRoute(target);
            return;
          }
        }
        setRoute(next);
      },
      goBack: () => setRoute('Login'),
    }),
    []
  );

  return (
    <DatabaseProvider>
      <AuthProvider>
        <View style={styles.container}>
          {route === 'Test' && <TestScreen navigation={navigation} />}
          {route === 'Landing' && <LandingScreen navigation={navigation} />}
          {route === 'Login' && <LoginScreen navigation={navigation} />}
          {route === 'Register' && <RegisterScreen navigation={navigation} />}
          {route === 'Admin' && (
            <View style={{ flex: 1 }}>
              <AdminDashboardScreen navigation={navigation} />
              <BottomNav onNavigate={navigation.navigate} />
            </View>
          )}
          {route === 'Lecturer' && (
            <View style={{ flex: 1 }}>
              <LecturerDashboardScreen navigation={navigation} />
              <BottomNav onNavigate={navigation.navigate} />
            </View>
          )}
          {route === 'Student' && (
            <View style={{ flex: 1 }}>
              <StudentDashboardScreen navigation={navigation} />
              <BottomNav onNavigate={navigation.navigate} />
            </View>
          )}
          <StatusBar style="light" />
        </View>
      </AuthProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
