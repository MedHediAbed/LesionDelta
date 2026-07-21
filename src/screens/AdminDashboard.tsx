import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { showAlert } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';

type Medecin = {
  id: string;
  first_name: string;
  last_name: string;
  speciality: string | null;
  phone: string | null;
  license_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetchMedecins = useCallback(async () => {
    let query = supabase.from('medecins').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    const { data, error } = await query;
    if (error) {
      showAlert('Erreur', error.message);
    } else {
      setMedecins(data as Medecin[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMedecins();
    }, [fetchMedecins])
  );

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('medecins').update({ status }).eq('id', id);
    if (error) {
      showAlert('Erreur', error.message);
      return;
    }
    fetchMedecins();
  };

  const renderItem = ({ item }: { item: Medecin }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        Dr {item.first_name} {item.last_name}
      </Text>
      {!!item.speciality && <Text style={styles.cardText}>Spécialité : {item.speciality}</Text>}
      {!!item.phone && <Text style={styles.cardText}>Téléphone : {item.phone}</Text>}
      {!!item.license_number && <Text style={styles.cardText}>Licence : {item.license_number}</Text>}
      <Text style={[styles.badge, styles[`badge_${item.status}` as const]]}>{item.status}</Text>

      {item.status === 'pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => updateStatus(item.id, 'approved')}>
            <Text style={styles.actionText}>Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => updateStatus(item.id, 'rejected')}>
            <Text style={styles.actionText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Espace Admin</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => {
              setFilter(f);
              setLoading(true);
            }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1E3A5F" />
      ) : (
        <FlatList
          data={medecins}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMedecins();
              }}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>Aucun médecin dans cette catégorie.</Text>}
        />
      )}
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
  filters: { flexDirection: 'row', padding: 12, gap: 8 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E4E9F0',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#1E3A5F' },
  filterText: { color: '#333', fontSize: 12, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E9F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A5F', marginBottom: 4 },
  cardText: { fontSize: 13, color: '#555' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  badge_pending: { backgroundColor: '#FFF3CD', color: '#8A6D00' },
  badge_approved: { backgroundColor: '#D4EDDA', color: '#1E7E34' },
  badge_rejected: { backgroundColor: '#F8D7DA', color: '#B00020' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#1E7E34' },
  rejectBtn: { backgroundColor: '#B00020' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
