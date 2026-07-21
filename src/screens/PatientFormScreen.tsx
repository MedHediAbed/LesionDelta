import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showAlert } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import { PATIENT_FIELD_SECTIONS, FieldDef } from '../constants/patientFields';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Convertit la valeur texte saisie vers le bon type avant l'envoi à Supabase.
// Une chaîne vide devient `null` pour ne pas forcer 0 / fausse date en base.
function parseValue(raw: string, type: FieldDef['type']) {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  switch (type) {
    case 'integer': {
      const n = parseInt(trimmed, 10);
      return Number.isNaN(n) ? null : n;
    }
    case 'numeric': {
      // On garde la string : Postgres `numeric` la convertit sans perte de
      // précision binaire (contrairement à un parseFloat en JS).
      const normalized = trimmed.replace(',', '.');
      return Number.isNaN(Number(normalized)) ? null : normalized;
    }
    default:
      return trimmed;
  }
}

function keyboardTypeFor(type: FieldDef['type']) {
  if (type === 'integer') return 'number-pad';
  if (type === 'numeric') return 'decimal-pad';
  return 'default';
}

function placeholderFor(type: FieldDef['type']) {
  if (type === 'date') return 'AAAA-MM-JJ';
  if (type === 'time') return 'HH:MM:SS';
  return undefined;
}

export default function PatientFormScreen({ route, navigation }: any) {
  const patient = route.params?.patient ?? null;
  const isEditing = !!patient;
  const { session } = useAuth();

  const [firstName, setFirstName] = useState(patient?.first_name ?? '');
  const [lastName, setLastName] = useState(patient?.last_name ?? '');
  const [loading, setLoading] = useState(false);

  // Un seul état plat { field_key: 'valeur saisie en texte' } pour tous les
  // champs DICOM, quel que soit leur type final en base.
  const initialValues: Record<string, string> = {};
  PATIENT_FIELD_SECTIONS.forEach((section) => {
    section.fields.forEach((f) => {
      const existing = patient?.[f.key];
      initialValues[f.key] = existing !== undefined && existing !== null ? String(existing) : '';
    });
  });
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(openSection === title ? null : title);
  };

  const setFieldValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Champs requis', 'Le nom et le prénom sont obligatoires.');
      return;
    }

    setLoading(true);

    const payload: Record<string, any> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    };

    PATIENT_FIELD_SECTIONS.forEach((section) => {
      section.fields.forEach((f) => {
        payload[f.key] = parseValue(values[f.key] ?? '', f.type);
      });
    });

    if (isEditing) {
      const { error } = await supabase.from('patients').update(payload).eq('id', patient.id);
      setLoading(false);
      if (error) {
        showAlert('Erreur', error.message);
        return;
      }
    } else {
      payload.medecin_id = session?.user.id;
      const { error } = await supabase.from('patients').insert(payload);
      setLoading(false);
      if (error) {
        showAlert('Erreur', error.message);
        return;
      }
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>
          {isEditing ? 'Modifier le patient' : 'Nouveau patient'}
        </Text>

        {/* Champs de base, toujours visibles */}
        <View style={styles.baseCard}>
          <Text style={styles.label}>Prénom *</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" />
          <Text style={styles.label}>Nom *</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" />
        </View>

        {isEditing && (
          <TouchableOpacity
            style={styles.shareCard}
            onPress={() =>
              navigation.navigate('SharePatient', {
                patientId: patient.id,
                patientLabel: `${firstName} ${lastName}`,
                isOwner: patient.medecin_id === session?.user.id,
              })
            }
          >
            <Text style={styles.shareCardText}>👥 Gérer le partage avec d'autres médecins</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Les champs ci-dessous sont optionnels. Ouvrez uniquement les sections dont vous avez besoin.
        </Text>

        {PATIENT_FIELD_SECTIONS.map((section) => {
          const isOpen = openSection === section.title;
          const filledCount = section.fields.filter((f) => (values[f.key] ?? '').trim() !== '').length;

          return (
            <View key={section.title} style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(section.title)}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionHeaderRight}>
                  {filledCount > 0 && (
                    <Text style={styles.sectionCount}>{filledCount} rempli{filledCount > 1 ? 's' : ''}</Text>
                  )}
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.sectionBody}>
                  {section.fields.map((f) => (
                    <View key={f.key} style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                      <TextInput
                        style={styles.input}
                        value={values[f.key]}
                        onChangeText={(t) => setFieldValue(f.key, t)}
                        keyboardType={keyboardTypeFor(f.type) as any}
                        placeholder={placeholderFor(f.type)}
                        placeholderTextColor="#AAB4C0"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  title: { fontSize: 20, fontWeight: '700', color: '#1E3A5F', marginTop: 20, marginBottom: 16 },
  baseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    marginBottom: 8,
  },
  shareCard: {
    backgroundColor: '#EAF1FB',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  shareCardText: { color: '#1E3A5F', fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 12, color: '#888', marginVertical: 14 },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE3EA',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  sectionCount: { fontSize: 11, color: '#1E7E34', backgroundColor: '#D4EDDA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  chevron: { color: '#1E3A5F', fontSize: 12 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
  fieldWrap: { marginTop: 12 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E9F0',
  },
  cancelButton: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F2F5' },
  cancelText: { color: '#555', fontWeight: '600' },
  button: { flex: 2, backgroundColor: '#1E3A5F', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
