import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { showAlert, confirmAlert } from '../lib/alerts';

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  medecin_id: string;
  medecins: { first_name: string; last_name: string } | null; // propriétaire
};

export default function MedecinDashboard({ navigation }: any) {
  const { signOut, session } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchPatients = useCallback(async () => {
    // Pas de filtre .eq ici : les policies RLS renvoient déjà uniquement
    // les patients possédés + ceux partagés avec l'utilisateur connecté.
    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, medecin_id, medecins:medecin_id(first_name, last_name)')
      .order('last_name', { ascending: true });

    if (error) {
      showAlert('Erreur', error.message);
    } else {
      setPatients(data as any);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPatients();
    }, [fetchPatients])
  );

  const handleDelete = (patient: Patient) => {
    confirmAlert(
      'Supprimer le patient',
      `Confirmez-vous la suppression de ${patient.first_name} ${patient.last_name} ?`,
      async () => {
        const { data, error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id)
          .select();

        if (error) {
          showAlert('Erreur', error.message);
          return;
        }
        if (!data || data.length === 0) {
          showAlert(
            'Suppression refusée',
            "La suppression n'a pas été effectuée (droits insuffisants ou patient introuvable)."
          );
          return;
        }
        fetchPatients();
      },
      'Supprimer',
      true
    );
  };

  const filtered = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Patient }) => {
    const isOwner = item.medecin_id === session?.user.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PatientForm', { patient: item })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {item.first_name} {item.last_name}
          </Text>
          {!isOwner && item.medecins && (
            <Text style={styles.sharedBy}>
              Partagé par Dr {item.medecins.first_name} {item.medecins.last_name}
            </Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('SharePatient', {
                patientId: item.id,
                patientLabel: `${item.first_name} ${item.last_name}`,
                isOwner,
              })
            }
          >
            <Text style={styles.shareBtn}>Partager</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.deleteText}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes patients</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un patient..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1E3A5F" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPatients();
              }}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>Aucun patient pour le moment.</Text>}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PatientForm', { patient: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1E3A5F',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  logout: { color: '#fff', fontSize: 13 },
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE3EA',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
  sharedBy: { fontSize: 11, color: '#8A6D00', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  shareBtn: { color: '#1E3A5F', fontSize: 12, fontWeight: '600' },
  deleteText: { color: '#B00020', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
