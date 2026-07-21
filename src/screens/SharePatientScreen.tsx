import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { showAlert, confirmAlert } from '../lib/alerts';

type Medecin = {
  id: string;
  first_name: string;
  last_name: string;
  speciality: string | null;
};

type AccessRow = {
  id: string;
  medecin_id: string;
  medecins: Medecin;
};

export default function SharePatientScreen({ route, navigation }: any) {
  const { patientId, patientLabel, isOwner } = route.params;
  const { session } = useAuth();

  const [shares, setShares] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Medecin[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchShares = useCallback(async () => {
    const { data, error } = await supabase
      .from('patient_access')
      .select('id, medecin_id, medecins:medecin_id(id, first_name, last_name, speciality)')
      .eq('patient_id', patientId);

    if (error) {
      showAlert('Erreur', error.message);
    } else {
      setShares((data as any) ?? []);
    }
    setLoading(false);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchShares();
    }, [fetchShares])
  );

  const searchMedecins = async (text: string) => {
    setSearch(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from('medecins')
      .select('id, first_name, last_name, speciality')
      .eq('status', 'approved')
      .neq('id', session?.user.id)
      .or(`first_name.ilike.%${text}%,last_name.ilike.%${text}%`)
      .limit(10);

    setSearching(false);
    if (!error) {
      const alreadyShared = new Set(shares.map((s) => s.medecin_id));
      setResults((data as Medecin[]).filter((m) => !alreadyShared.has(m.id)));
    }
  };

  const grantAccess = async (medecin: Medecin) => {
    const { error } = await supabase.from('patient_access').insert({
      patient_id: patientId,
      medecin_id: medecin.id,
      granted_by: session?.user.id,
    });
    if (error) {
      showAlert('Erreur', error.message);
      return;
    }
    setSearch('');
    setResults([]);
    fetchShares();
  };

  const revokeAccess = (row: AccessRow) => {
    confirmAlert(
      "Retirer l'accès",
      `Retirer l'accès de Dr ${row.medecins.first_name} ${row.medecins.last_name} à ce patient ?`,
      async () => {
        const { data, error } = await supabase
          .from('patient_access')
          .delete()
          .eq('id', row.id)
          .select();

        if (error) {
          showAlert('Erreur', error.message);
          return;
        }
        if (!data || data.length === 0) {
          showAlert('Action refusée', "Le retrait n'a pas été effectué (droits insuffisants).");
          return;
        }
        fetchShares();
      },
      'Retirer',
      true
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Partage — {patientLabel}</Text>

      {!isOwner && (
        <Text style={styles.notice}>
          Ce patient vous a été partagé. Seul le médecin propriétaire peut gérer les accès.
        </Text>
      )}

      <Text style={styles.sectionLabel}>Médecins ayant accès</Text>
      <FlatList
        data={shares}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Ce patient n'est partagé avec personne.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>
                Dr {item.medecins.first_name} {item.medecins.last_name}
              </Text>
              {!!item.medecins.speciality && (
                <Text style={styles.rowSubtitle}>{item.medecins.speciality}</Text>
              )}
            </View>
            {(isOwner || item.medecin_id === session?.user.id) && (
              <TouchableOpacity onPress={() => revokeAccess(item)}>
                <Text style={styles.revoke}>Retirer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {isOwner && (
        <>
          <Text style={styles.sectionLabel}>Partager avec un confrère</Text>
          <TextInput
            style={styles.input}
            placeholder="Rechercher par nom..."
            value={search}
            onChangeText={searchMedecins}
          />
          {searching && <ActivityIndicator style={{ marginTop: 8 }} color="#1E3A5F" />}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => grantAccess(item)}>
                <View>
                  <Text style={styles.rowTitle}>
                    Dr {item.first_name} {item.last_name}
                  </Text>
                  {!!item.speciality && <Text style={styles.rowSubtitle}>{item.speciality}</Text>}
                </View>
                <Text style={styles.add}>Ajouter</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  title: { fontSize: 18, fontWeight: '700', color: '#1E3A5F', marginBottom: 8 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#1E3A5F', fontSize: 15, fontWeight: '600' },
  notice: { fontSize: 12, color: '#8A6D00', backgroundColor: '#FFF3CD', padding: 10, borderRadius: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 20, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE3EA',
    marginBottom: 8,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1E3A5F' },
  rowSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  revoke: { color: '#B00020', fontSize: 12, fontWeight: '600' },
  add: { color: '#1E7E34', fontSize: 12, fontWeight: '600' },
  empty: { color: '#999', fontSize: 13, marginBottom: 8 },
});
