import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AppBadge, AppSectionHeader, AppTimeline } from '@/components/design-system';
import { Button, Card, EmptyState, LoadingState, Message, Row, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Claim, ClaimDocument, ClaimHistory, ClaimStatus, Vehicle } from '@/lib/types';

export default function ClaimDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<ClaimHistory[]>([]);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [claimResult, historyResult, documentsResult] = await Promise.all([
        supabase.from('claims').select('*').eq('id', id).maybeSingle(),
        supabase.from('claim_status_history').select('*').eq('claim_id', id).order('created_at', { ascending: false }),
        supabase.from('claim_documents').select('*').eq('claim_id', id).order('created_at', { ascending: false }),
      ]);
      setClaim(claimResult.data);
      if (claimResult.data?.vehicle_id) {
        const { data } = await supabase.from('vehicles').select('*').eq('id', claimResult.data.vehicle_id).maybeSingle();
        setVehicle(data);
      }
      setHistory(historyResult.data ?? []);
      setDocuments(documentsResult.data ?? []);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function openDocument(document: ClaimDocument) {
    setMessage('');
    const { data, error } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 300);
    if (error || !data?.signedUrl) {
      setMessage('We could not open this document. Please try again.');
      return;
    }
    await Linking.openURL(data.signedUrl);
  }

  if (loading) return <Screen title="Claim Detail"><LoadingState /></Screen>;
  if (!claim) return <Screen title="Claim Detail"><EmptyState title="Claim not found" body="Please go back and choose a claim from your list." /></Screen>;

  return (
    <Screen title="Claim Detail" subtitle="Review claim information and status timeline." showLogout>
      {message ? <Message type="error">{message}</Message> : null}
      <Card>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCopy}>
            <Text style={styles.claimNo}>{claim.claim_no}</Text>
            <Text style={styles.vehicleNo}>{vehicle?.vehicle_no ?? 'Vehicle linked'}</Text>
          </View>
          <AppBadge label={claim.current_status} tone={statusTone(claim.current_status)} />
        </View>
        <Row label="Last update" value={formatDateTime(claim.updated_at ?? claim.created_at)} />
        <Row label="Accident date" value={claim.accident_at ? formatDateTime(claim.accident_at) : null} />
        <Row label="Location" value={claim.accident_location} />
      </Card>
      <Card>
        <AppSectionHeader title="Claim journey" />
        <AppTimeline steps={buildJourney(claim.current_status, history)} />
      </Card>
      <Card>
        <AppSectionHeader title="Documents" />
        {documents.length ? documents.map((document) => (
          <Fragment key={document.id}>
            <Row label={document.document_type} value={`${document.file_name} - ${document.verification_status}`} />
            <Button label="Open document" variant="secondary" onPress={() => void openDocument(document)} />
          </Fragment>
        )) : <Text style={styles.emptyText}>No claim documents uploaded yet.</Text>}
      </Card>
      <Card>
        <AppSectionHeader title="Status history" />
        {history.length ? null : <Text style={styles.emptyText}>No timeline updates yet.</Text>}
        {history.map((item) => <Row key={item.id} label={item.to_status} value={item.notes ?? item.created_at?.slice(0, 10)} />)}
      </Card>
      <Button label="Upload documents" onPress={() => router.push({ pathname: '/customer/upload-documents', params: { claimId: claim.id } })} />
      <Button label="Claims Desk" variant="secondary" onPress={() => router.push('/customer/support')} />
    </Screen>
  );
}

const journey: { label: string; statuses: ClaimStatus[] }[] = [
  { label: 'Accident Reported', statuses: ['Accident Reported'] },
  { label: 'Documents Submitted', statuses: ['Documents Submitted', 'Documents Pending'] },
  { label: 'Surveyor Assigned', statuses: ['Surveyor Appointed'] },
  { label: 'Survey Completed', statuses: ['Vehicle Inspected'] },
  { label: 'Intimation Sent', statuses: ['Claim Intimated'] },
  { label: 'Work Approval Pending', statuses: ['Estimate Submitted', 'Approval Pending'] },
  { label: 'Under Repair', statuses: ['Repair Started', 'Repair Completed'] },
  { label: 'Final Bill Submitted', statuses: ['Final Bill Submitted'] },
  { label: 'Payment Advice Received', statuses: ['Settlement Under Process'] },
  { label: 'Journey Complete', statuses: ['Settled', 'Closed'] },
];

function buildJourney(currentStatus: ClaimStatus, history: ClaimHistory[]) {
  const currentIndex = Math.max(0, journey.findIndex((step) => step.statuses.includes(currentStatus)));
  const completedStatuses = new Set(history.map((item) => item.to_status));
  completedStatuses.add(currentStatus);
  return journey.map((step, index) => {
    const state = index < currentIndex || (index <= currentIndex && step.statuses.some((status) => completedStatuses.has(status)) && step.statuses[0] !== currentStatus)
      ? 'complete' as const
      : index === currentIndex
        ? 'current' as const
        : 'pending' as const;
    return { label: step.label, state, meta: step.statuses.includes(currentStatus) ? currentStatus : undefined };
  });
}

function statusTone(status: ClaimStatus) {
  if (['Settled', 'Closed'].includes(status)) return 'success';
  if (['Rejected'].includes(status)) return 'danger';
  if (['Approval Pending', 'Documents Pending', 'Settlement Under Process'].includes(status)) return 'warning';
  return 'info';
}

function formatDateTime(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  summaryCopy: { flex: 1, minWidth: 0 },
  claimNo: { color: '#0B1F3A', fontSize: 22, fontWeight: '900' },
  vehicleNo: { color: '#667085', fontSize: 14, fontWeight: '800', marginTop: 3 },
  emptyText: { color: '#667085', fontSize: 14, lineHeight: 20 },
});
