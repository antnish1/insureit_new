import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AppBadge, AppSectionHeader, AppTimeline } from '@/components/design-system';
import { Button, Card, EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Claim, ClaimDocument, ClaimHistory, ClaimStatus, ClaimTask, Customer, Policy, Vehicle } from '@/lib/types';

export default function StaffClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [history, setHistory] = useState<ClaimHistory[]>([]);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [claimResult, historyResult, documentsResult, tasksResult] = await Promise.all([
        supabase.from('claims').select('*').eq('id', id).maybeSingle(),
        supabase.from('claim_status_history').select('*').eq('claim_id', id).order('created_at', { ascending: false }),
        supabase.from('claim_documents').select('*').eq('claim_id', id).order('created_at', { ascending: false }),
        supabase.from('claim_tasks').select('*').eq('claim_id', id).order('created_at', { ascending: false }),
      ]);
      setClaim(claimResult.data);
      if (claimResult.data) {
        const [customerResult, vehicleResult, policyResult] = await Promise.all([
          supabase.from('customers').select('*').eq('id', claimResult.data.customer_id).maybeSingle(),
          supabase.from('vehicles').select('*').eq('id', claimResult.data.vehicle_id).maybeSingle(),
          supabase.from('policies').select('*').eq('id', claimResult.data.policy_id).maybeSingle(),
        ]);
        setCustomer(customerResult.data);
        setVehicle(vehicleResult.data);
        setPolicy(policyResult.data);
      }
      setHistory(historyResult.data ?? []);
      setDocuments(documentsResult.data ?? []);
      setTasks(tasksResult.data ?? []);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function openDocument(document: ClaimDocument) {
    const { data, error } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 300);
    if (!error && data?.signedUrl) await Linking.openURL(data.signedUrl);
  }

  if (loading) return <Screen title="Claim Detail"><LoadingState /></Screen>;
  if (!claim) return <Screen title="Claim Detail"><EmptyState title="Claim not found" body="Select another claim from the list." /></Screen>;

  return (
    <Screen title="Claim Detail" showLogout>
      <Card>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCopy}>
            <Text style={styles.claimNo}>{claim.claim_no}</Text>
            <Text style={styles.vehicleNo}>{vehicle?.vehicle_no ?? 'Vehicle linked'}</Text>
          </View>
          <AppBadge label={claim.current_status} tone={statusTone(claim.current_status)} />
        </View>
        <Row label="Location" value={claim.accident_location} />
        <Row label="Estimated loss" value={claim.estimated_loss} />
        <Row label="Last update" value={formatDateTime(claim.updated_at ?? claim.created_at)} />
      </Card>
      <Link href={{ pathname: '/staff/update-status', params: { id: claim.id } }} asChild>
        <Button label="Update Claim Status" onPress={() => undefined} />
      </Link>
      <Card>
        <AppSectionHeader title="Customer" />
        <Row label="Name" value={customer?.contact_name ?? customer?.company_name} />
        <Row label="Phone" value={customer?.phone} />
        <Row label="Email" value={customer?.email} />
      </Card>
      <Card>
        <AppSectionHeader title="Vehicle and policy" />
        <Row label="Vehicle" value={vehicle?.vehicle_no} />
        <Row label="Make / model" value={[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')} />
        <Row label="Policy" value={policy?.policy_no} />
        <Row label="Policy period" value={policy ? `${policy.start_date} to ${policy.end_date}` : null} />
      </Card>
      <Card>
        <AppSectionHeader title="Documents" />
        {documents.length ? documents.map((document) => (
          <View key={document.id}>
            <Row label={document.document_type} value={`${document.file_name} - ${document.verification_status}`} />
            <Button label="Open document" variant="secondary" onPress={() => void openDocument(document)} />
          </View>
        )) : <Text style={styles.emptyText}>No documents uploaded yet.</Text>}
      </Card>
      <Card>
        <AppSectionHeader title="Claim journey" />
        <AppTimeline steps={buildJourney(claim.current_status, history)} />
      </Card>
      <Card>
        <AppSectionHeader title="Follow-ups" />
        <Row label="Follow-up tasks" value={tasks.length} />
        {tasks.map((task) => <Row key={task.id} label={task.title} value={task.status} />)}
      </Card>
      <Card>
        <AppSectionHeader title="Status history" />
        {history.length ? null : <Text style={styles.emptyText}>No updates yet.</Text>}
        {history.map((item) => <Row key={item.id} label={item.to_status} value={item.notes ?? item.created_at?.slice(0, 10)} />)}
      </Card>
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
  return journey.map((step, index) => ({
    label: step.label,
    state: index < currentIndex ? 'complete' as const : index === currentIndex ? 'current' as const : 'pending' as const,
    meta: step.statuses.includes(currentStatus) ? currentStatus : undefined,
  }));
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
