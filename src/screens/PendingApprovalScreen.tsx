import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalScreen() {
  const { signOut, medecinStatus, refreshProfile } = useAuth();

  const isRejected = medecinStatus === 'rejected';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{isRejected ? '✖' : '⏳'}</Text>
      <Text style={styles.title}>
        {isRejected ? 'Compte refusé' : 'Compte en attente de validation'}
      </Text>
      <Text style={styles.text}>
        {isRejected
          ? "Votre demande d'inscription n'a pas été validée par l'administrateur."
          : "Un administrateur doit valider votre compte avant que vous puissiez accéder à l'application."}
      </Text>

      <TouchableOpacity style={styles.button} onPress={refreshProfile}>
        <Text style={styles.buttonText}>Vérifier à nouveau</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut}>
        <Text style={styles.link}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F5F7FA' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E3A5F', textAlign: 'center', marginBottom: 12 },
  text: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#1E3A5F', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { color: '#B00020', marginTop: 20 },
});
