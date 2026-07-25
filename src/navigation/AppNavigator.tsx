import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import AdminDashboard from '../screens/AdminDashboard';
import MedecinDashboard from '../screens/MedecinDashboard';
import PatientFormScreen from '../screens/PatientFormScreen';
import SharePatientScreen from '../screens/SharePatientScreen';
import ConsultationScreen from '../screens/ConsultationScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
    </Stack.Navigator>
  );
}

function MedecinStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedecinDashboard" component={MedecinDashboard} />
      <Stack.Screen
        name="PatientForm"
        component={PatientFormScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SharePatient"
        component={SharePatientScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Consultation"
        component={ConsultationScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, role, medecinStatus, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthStack />
      ) : role === 'admin' ? (
        <AdminStack />
      ) : role === 'medecin' && medecinStatus === 'approved' ? (
        <MedecinStack />
      ) : role === 'medecin' ? (
        <PendingApprovalScreen />
      ) : (
        // Rôle inconnu ou profil pas encore créé
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      )}
    </NavigationContainer>
  );
}
