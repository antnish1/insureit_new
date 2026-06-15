import { Fragment, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBadge, AppSectionHeader } from '@/components/design-system';
import { Button, Card, EmptyState, LoadingState, Message, Row, Screen, TextField } from '@/components/ui';
import { getCurrentSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Claim, ClaimDocument } from '@/lib/types';

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [rejectingId, setRejectingId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const documentsResult = await supabase.from('claim_documents').select('*').order('created_at', { ascending: false }).limit(80);
    const nextDocuments = documentsResult.data ?? [];
    const claimIds = Array.from(new Set(nextDocuments.map((document) => document.claim_id)));
    const claimsResult = claimIds.length
      ? await supabase.from('claims').select('*').in('id', claimIds).order('created_at', { ascending: false })
      : { data: [] };
    setDocuments(nextDocuments);
    setClaims(claimsResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const groupedClaims = useMemo(() => claims.map((claim) => ({
    claim,
    documents: documents.filter((document) => document.claim_id === claim.id),
  })).filter((group) => group.documents.length), [claims, documents]);

  async function review(document: ClaimDocument, verification_status: 'verified' | 'rejected') {
    setMessage('');
    if (verification_status === 'rejected' && rejectingId !== document.id) {
      setRejectingId(document.id);
      setReason('');
      return;
    }
    const session = await getCurrentSession();
    const { error } = await supabase.from('claim_documents').update({
      verification_status,
      verified_by: session?.user.id ?? null,
      verified_at: new Date().toISOString(),
      rejection_reason: verification_status === 'rejected' ? reason.trim() || 'Needs correction' : null,
    }).eq('id', document.id);
    if (error) setMessage('Document review could not be saved.');
    else {
      setRejectingId('');
      setReason('');
      void load();
    }
  }

  async function openDocument(document: ClaimDocument) {
    setMessage('');
    const { data, error } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 300);
    if (error || !data?.signedUrl) {
      setMessage('Document could not be opened.');
      return;
    }
    await Linking.openURL(data.signedUrl);
  }

  if (loading) return <Screen title="Document Review"><LoadingState /></Screen>;

  return (
    <Screen title="Document Review">
      {message ? <Message type="error">{message}</Message> : null}
      {groupedClaims.length === 0 ? <EmptyState title="No documents found" body="Uploaded claim files will appear here." /> : groupedClaims.map(({ claim, documents: claimDocuments }) => (
        <Card key={claim.id}>
          <AppSectionHeader title={claim.claim_no} />
          <Row label="Status" value={claim.current_status} />
          {claimDocuments.map((document) => (
            <Fragment key={document.id}>
              <View style={styles.documentRow}>
                <View style={styles.documentCopy}>
                  <Text style={styles.documentType}>{document.document_type}</Text>
                  <Text style={styles.documentName} numberOfLines={1}>{document.file_name}</Text>
                </View>
                <AppBadge label={document.verification_status} tone={document.verification_status === 'verified' ? 'success' : document.verification_status === 'rejected' ? 'danger' : 'warning'} />
              </View>
              <View style={styles.actions}>
                <CompactButton label="Open" onPress={() => void openDocument(document)} />
                {document.verification_status === 'pending' ? (
                  <>
                    <CompactButton label="Verify" onPress={() => void review(document, 'verified')} />
                    <CompactButton label="Reject" danger onPress={() => void review(document, 'rejected')} />
                  </>
                ) : null}
              </View>
              {rejectingId === document.id ? (
                <View style={styles.rejectBox}>
                  <TextField label="Rejection reason" value={reason} onChangeText={setReason} />
                  <Button label="Save rejection" variant="danger" onPress={() => void review(document, 'rejected')} />
                </View>
              ) : null}
            </Fragment>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function CompactButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.compactButton, danger && styles.compactDanger]}>
      <Text style={[styles.compactText, danger && styles.compactDangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#D8DEE8', paddingTop: 9, marginTop: 7 },
  documentCopy: { flex: 1, minWidth: 0 },
  documentType: { color: '#0B1F3A', fontSize: 14, fontWeight: '900' },
  documentName: { color: '#667085', fontSize: 12, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 2 },
  compactButton: { flex: 1, minHeight: 34, borderRadius: 12, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  compactDanger: { borderColor: '#FECACA', backgroundColor: '#FEEFEF' },
  compactText: { color: '#0B1F3A', fontSize: 12, fontWeight: '900' },
  compactDangerText: { color: '#B42318' },
  rejectBox: { marginTop: 6 },
});
