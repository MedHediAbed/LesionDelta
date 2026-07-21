import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showAlert } from '../lib/alerts';

export default function SignupScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !firstName || !lastName) {
      showAlert('Champs requis', 'Merci de remplir au minimum email, mot de passe, nom et prénom.');
      return;
    }

    setLoading(true);

    // 1) Créer l'utilisateur dans Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      showAlert('Inscription échouée', signUpError?.message ?? 'Erreur inconnue');
      return;
    }

    const userId = signUpData.user.id;

    // 2) Créer la ligne profiles (role = medecin)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email: email.trim(),
      role: 'medecin',
    });

    if (profileError) {
      setLoading(false);
      showAlert('Erreur profil', profileError.message);
      return;
    }

    // 3) Créer la ligne medecins (status = pending, en attente de validation admin)
    const { error: medecinError } = await supabase.from('medecins').insert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      speciality: speciality.trim(),
      phone: phone.trim(),
      license_number: licenseNumber.trim(),
      status: 'pending',
    });

    setLoading(false);

    if (medecinError) {
      showAlert('Erreur inscription médecin', medecinError.message);
      return;
    }

    showAlert(
      'Inscription envoyée',
      "Votre compte a été créé et est en attente de validation par un administrateur.",
      () => navigation.navigate('Login')
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inscription Médecin</Text>

      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder="Spécialité" value={speciality} onChangeText={setSpeciality} />
      <TextInput style={styles.input} placeholder="Téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Numéro de licence" value={licenseNumber} onChangeText={setLicenseNumber} />

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>S'inscrire</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F5F7FA' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#1E3A5F', marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDE3EA',
  },
  button: { backgroundColor: '#1E3A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', color: '#1E3A5F', marginTop: 20, fontSize: 13 },
});
