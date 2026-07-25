import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { showAlert } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';

type BoolValue = 'yes' | 'no' | '';
const toBoolean = (value: BoolValue) => value === '' ? null : value === 'yes';
const textOrNull = (value: string) => value.trim() || null;
const numberOrNull = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  return normalized && !Number.isNaN(Number(normalized)) ? normalized : null;
};
const visitDateToIso = (value: string) => {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
};

function YesNo({ value, onChange }: { value: BoolValue; onChange: (value: BoolValue) => void }) {
  return <View style={styles.choiceRow}>{(['yes', 'no'] as const).map((choice) => <TouchableOpacity key={choice} style={[styles.choice, value === choice && styles.choiceSelected]} onPress={() => onChange(choice)}><Text style={[styles.choiceText, value === choice && styles.choiceTextSelected]}>{choice === 'yes' ? 'Oui' : 'Non'}</Text></TouchableOpacity>)}</View>;
}

export default function ConsultationScreen({ route, navigation }: any) {
  const { patient } = route.params;
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recordNumber, setRecordNumber] = useState(patient?.medical_record_number ?? '');
  const [visitDate, setVisitDate] = useState('');
  const [relapse, setRelapse] = useState<BoolValue>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [edss, setEdss] = useState('');
  const [worsening, setWorsening] = useState<BoolValue>('');
  const [worseningComments, setWorseningComments] = useState('');
  const [csfOpen, setCsfOpen] = useState(false);
  const [isofocalisation, setIsofocalisation] = useState<BoolValue>('');
  const [csfProfile, setCsfProfile] = useState('');
  const [kappaIndex, setKappaIndex] = useState('');
  const [csfOther, setCsfOther] = useState('');
  const [hptDominance, setHptDominance] = useState('');
  const [sdmt, setSdmt] = useState('');
  const [mriLoad, setMriLoad] = useState('');
  const [mriActivity, setMriActivity] = useState('');
  const [mriComparison, setMriComparison] = useState('');
  const [treatment, setTreatment] = useState('');
  const [walkTest, setWalkTest] = useState('');

  const openImagingWeb = async () => {
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (!freshSession) return showAlert('Session invalide', 'Reconnectez-vous puis réessayez.');
    const dicomFolderPath = `patients/${patient.id}`;
    const { error: pathError } = await supabase
      .from('patients')
      .update({ dicom_folder_path: dicomFolderPath })
      .eq('id', patient.id);
    if (pathError) return showAlert('Erreur', pathError.message);
    const webBaseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || 'http://localhost:4200';
    const url = `${webBaseUrl}/upload?patientId=${encodeURIComponent(patient.id)}&storageBucket=dicom-series&dicomFolderPath=${encodeURIComponent(dicomFolderPath)}&access_token=${encodeURIComponent(freshSession.access_token)}&refresh_token=${encodeURIComponent(freshSession.refresh_token)}`;
    Linking.openURL(url).catch(() => showAlert('Erreur', "Impossible d'ouvrir l’application OHIF. Vérifiez que le serveur web tourne."));
  };

  const goNext = () => {
    if (!recordNumber.trim() || !visitDate.trim()) return showAlert('Champs requis', 'Renseignez le numéro du dossier et la date de visite.');
    if (!visitDateToIso(visitDate)) return showAlert('Date invalide', 'Utilisez le format jj-mm-aaaa.');
    setPage(2);
  };

  const save = async () => {
    const isoVisitDate = visitDateToIso(visitDate);
    if (!isoVisitDate || !recordNumber.trim()) return goNext();
    if (csfProfile && !['1', '2', '3', '4'].includes(csfProfile)) return showAlert('Profil LCR invalide', 'Choisissez un profil de type 1, 2, 3 ou 4.');
    if (hptDominance && !['dominant', 'non_dominant'].includes(hptDominance)) return showAlert('HPT invalide', 'Choisissez dominant ou non-dominant.');
    setLoading(true);
    const payload = {
      patient_id: patient.id, medecin_id: session?.user.id, medical_record_number: recordNumber.trim(), visit_date: isoVisitDate,
      relapse: toBoolean(relapse), weight_kg: numberOrNull(weight), height_cm: numberOrNull(height), physical_exam: textOrNull(physicalExam), edss_score: numberOrNull(edss),
      worsening: toBoolean(worsening), worsening_comments: textOrNull(worseningComments), csf_isofocalisation: toBoolean(isofocalisation), csf_profile: csfProfile ? Number(csfProfile) : null, csf_kappa_index: numberOrNull(kappaIndex), csf_other: textOrNull(csfOther),
      hpt_tested_limb_dominance: hptDominance || null, sdmt_score: numberOrNull(sdmt), mri_lesion_load: textOrNull(mriLoad), mri_activity: textOrNull(mriActivity), mri_comparative: textOrNull(mriComparison), treatment_received: textOrNull(treatment), walk_test_seconds: numberOrNull(walkTest),
    };
    const { error } = await supabase.from('consultations').insert(payload);
    if (!error) await supabase.from('patients').update({ medical_record_number: recordNumber.trim() }).eq('id', patient.id);
    setLoading(false);
    if (error) return showAlert('Erreur', error.message);
    navigation.popToTop();
  };

  const field = (label: string, value: string, onChange: (value: string) => void, keyboardType: any = 'default', multiline = false) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.multiline]} value={value} onChangeText={onChange} keyboardType={keyboardType} multiline={multiline} /></View>;

  return <View style={styles.container}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Ajouter une consultation</Text><Text style={styles.patient}>{patient.first_name} {patient.last_name}</Text><View style={styles.stepper}><Text style={[styles.step, page === 1 && styles.stepActive]}>1. Visite</Text><Text style={styles.separator}>—</Text><Text style={[styles.step, page === 2 && styles.stepActive]}>2. Examen</Text></View>
    {page === 1 ? <>
      {field('Numéro du dossier *', recordNumber, setRecordNumber)}
      {field('Date de visite * (jj-mm-aaaa)', visitDate, setVisitDate, 'number-pad')}
      <Text style={styles.label}>Poussées de la maladie</Text><YesNo value={relapse} onChange={setRelapse} />
      <View style={styles.vitals}><View style={styles.vital}>{field('Poids (kg)', weight, setWeight, 'decimal-pad')}</View><View style={styles.vital}>{field('Taille (cm)', height, setHeight, 'decimal-pad')}</View></View>
    </> : <>
      {field('Examen physique', physicalExam, setPhysicalExam, 'default', true)}
      {field('EDSS score', edss, setEdss, 'decimal-pad')}
      <Text style={styles.label}>Aggravation par rapport à l’examen précédent</Text><YesNo value={worsening} onChange={setWorsening} />
      {worsening === 'yes' && field('Commentaires', worseningComments, setWorseningComments, 'default', true)}
      <View style={styles.slide}><TouchableOpacity style={styles.slideHeader} onPress={() => setCsfOpen(!csfOpen)}><Text style={styles.slideTitle}>Données LCR</Text><Text style={styles.slideIcon}>{csfOpen ? '▲' : '▼'}</Text></TouchableOpacity>{csfOpen && <View style={styles.slideBody}><Text style={styles.label}>Isofocalisation</Text><YesNo value={isofocalisation} onChange={setIsofocalisation} /><Text style={styles.label}>Profil</Text><View style={styles.choiceRow}>{['1', '2', '3', '4'].map(type => <TouchableOpacity key={type} style={[styles.choice, csfProfile === type && styles.choiceSelected]} onPress={() => setCsfProfile(type)}><Text style={[styles.choiceText, csfProfile === type && styles.choiceTextSelected]}>Type {type}</Text></TouchableOpacity>)}</View>{field('Index Kappa', kappaIndex, setKappaIndex, 'decimal-pad')}{field('Autres', csfOther, setCsfOther, 'default', true)}</View>}</View>
      <Text style={styles.label}>HPT — membre testé</Text><View style={styles.choiceRow}>{[['dominant', 'Dominant'], ['non_dominant', 'Non-dominant']].map(([value, label]) => <TouchableOpacity key={value} style={[styles.choice, hptDominance === value && styles.choiceSelected]} onPress={() => setHptDominance(value)}><Text style={[styles.choiceText, hptDominance === value && styles.choiceTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
      {field('SDMT score', sdmt, setSdmt, 'number-pad')}
      <Text style={styles.sectionTitle}>IRM</Text>{field('Charge lésionnelle', mriLoad, setMriLoad)}{field('Activité IRM', mriActivity, setMriActivity)}{field('IRM comparative', mriComparison, setMriComparison)}
      <TouchableOpacity style={styles.imagingButton} onPress={openImagingWeb}><Text style={styles.imagingText}>Insérer IRM</Text></TouchableOpacity>
      {field('Traitement reçu', treatment, setTreatment, 'default', true)}{field('Test de marche (secondes)', walkTest, setWalkTest, 'decimal-pad')}
    </>}
  </ScrollView><View style={styles.footer}>{page === 2 && <TouchableOpacity style={styles.backButton} onPress={() => setPage(1)}><Text style={styles.backText}>Précédent</Text></TouchableOpacity>}<TouchableOpacity style={styles.nextButton} onPress={page === 1 ? goNext : save} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>{page === 1 ? 'Suivant' : 'Enregistrer la consultation'}</Text>}</TouchableOpacity></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, content: { padding: 20, paddingBottom: 34 }, title: { fontSize: 22, fontWeight: '700', color: '#1E3A5F', marginTop: 18 }, patient: { color: '#64748B', marginTop: 4 }, stepper: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 }, step: { color: '#94A3B8', fontWeight: '700' }, stepActive: { color: '#1E3A5F' }, separator: { marginHorizontal: 10, color: '#CBD5E1' }, field: { marginBottom: 12 }, label: { fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 6 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 8, padding: 12, fontSize: 15 }, multiline: { minHeight: 90, textAlignVertical: 'top' }, choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }, choice: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 9 }, choiceSelected: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' }, choiceText: { color: '#475569', fontSize: 13 }, choiceTextSelected: { color: '#fff', fontWeight: '600' }, vitals: { flexDirection: 'row', gap: 10 }, vital: { flex: 1 }, slide: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E9F0', borderRadius: 10, marginVertical: 10, overflow: 'hidden' }, slideHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between' }, slideTitle: { color: '#1E3A5F', fontWeight: '700' }, slideIcon: { color: '#1E3A5F', fontSize: 12 }, slideBody: { padding: 15, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#E4E9F0' }, sectionTitle: { color: '#1E3A5F', fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 10 }, imagingButton: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: -2, marginBottom: 14 }, imagingText: { color: '#1E7E34', fontWeight: '700' }, footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E4E9F0' }, backButton: { padding: 14, borderRadius: 10, backgroundColor: '#F0F2F5' }, backText: { color: '#475569', fontWeight: '600' }, nextButton: { flex: 1, backgroundColor: '#1E3A5F', borderRadius: 10, padding: 14, alignItems: 'center' }, nextText: { color: '#fff', fontWeight: '700' },
});
