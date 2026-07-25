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
import { useAuth } from '../context/AuthContext';

const GENDERS = [
  { label: 'Féminin', value: 'female' },
  { label: 'Masculin', value: 'male' },
  { label: 'Autre', value: 'other' },
];

function toIsoDate(value: string) {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function displayDate(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}-${month}-${year}` : value;
}

export default function PatientFormScreen({ route, navigation }: any) {
  const patient = route.params?.patient ?? null;
  const isEditing = Boolean(patient);
  const { session } = useAuth();
  const [firstName, setFirstName] = useState(patient?.first_name ?? '');
  const [lastName, setLastName] = useState(patient?.last_name ?? '');
  const [gender, setGender] = useState(patient?.gender ?? '');
  const [birthDate, setBirthDate] = useState(displayDate(patient?.birth_date));
  const [loading, setLoading] = useState(false);

  const savePatient = async () => {
    if (!firstName.trim() || !lastName.trim() || !gender || !birthDate.trim()) {
      showAlert('Champs requis', 'Renseignez le nom, le prénom, le sexe et la date de naissance.');
      return null;
    }
    const parsedBirthDate = toIsoDate(birthDate);
    if (!parsedBirthDate) {
      showAlert('Date invalide', 'Utilisez le format jj-mm-aaaa.');
      return null;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender,
      birth_date: parsedBirthDate,
    };

    setLoading(true);
    const result = isEditing
      ? await supabase.from('patients').update(payload).eq('id', patient.id).select().single()
      : await supabase.from('patients').insert({ ...payload, medecin_id: session?.user.id }).select().single();
    setLoading(false);

    if (result.error) {
      showAlert('Erreur', result.error.message);
      return null;
    }
    return result.data;
  };

  const handleSave = async () => {
    const saved = await savePatient();
    if (saved) navigation.goBack();
  };

  const handleAddConsultation = async () => {
    const saved = isEditing ? patient : await savePatient();
    if (saved) navigation.replace('Consultation', { patient: saved });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEditing ? 'Modifier le patient' : 'Ajouter un patient'}</Text>
        <Text style={styles.subtitle}>Informations générales</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" />
          <Text style={styles.label}>Prénom *</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" />
          <Text style={styles.label}>Sexe *</Text>
          <View style={styles.choiceRow}>
            {GENDERS.map((option) => (
              <TouchableOpacity key={option.value} style={[styles.choice, gender === option.value && styles.choiceSelected]} onPress={() => setGender(option.value)}>
                <Text style={[styles.choiceText, gender === option.value && styles.choiceTextSelected]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Date de naissance *</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="jj-mm-aaaa" keyboardType="number-pad" maxLength={10} />
        </View>

        <TouchableOpacity style={styles.consultationButton} onPress={handleAddConsultation} disabled={loading}>
          <Text style={styles.consultationButtonText}>+ Ajouter une consultation</Text>
        </TouchableOpacity>
        {!isEditing && <Text style={styles.hint}>Le patient sera enregistré avant l’ouverture de la consultation.</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelText}>Annuler</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E3A5F', marginTop: 18 }, subtitle: { fontSize: 14, color: '#64748B', marginTop: 5, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E4E9F0' },
  label: { fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#DDE3EA', fontSize: 15 },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, choice: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, choiceSelected: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' }, choiceText: { color: '#475569', fontSize: 13 }, choiceTextSelected: { color: '#fff', fontWeight: '600' },
  consultationButton: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 15, marginTop: 16, alignItems: 'center' }, consultationButtonText: { color: '#1E7E34', fontWeight: '700' }, hint: { textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 8 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E4E9F0' }, cancelButton: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F2F5' }, cancelText: { color: '#555', fontWeight: '600' }, saveButton: { flex: 2, backgroundColor: '#1E3A5F', padding: 14, borderRadius: 10, alignItems: 'center' }, saveText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
