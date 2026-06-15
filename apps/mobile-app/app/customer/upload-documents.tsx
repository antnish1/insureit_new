import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBadge, AppSearchSelect, AppSectionHeader } from '@/components/design-system';
import { Button, Card, Message, Row, Screen } from '@/components/ui';
import { ensureCustomerForUser, getCurrentSession, getCustomerForUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Claim, ClaimDocument } from '@/lib/types';

type PickedFile = { uri: string; name: string; mimeType: string | null; size: number | null };

const documentSections = [
  { type: 'Accident photos', title: 'Accident photos', body: 'Vehicle, road, and visible damage.', imageFirst: true },
  { type: 'Registration certificate', title: 'Registration certificate', body: 'RC copy or clear photo.' },
  { type: 'Driving licence', title: 'Driving licence', body: 'Driver licence front and back.' },
  { type: 'Policy copy', title: 'Policy copy', body: 'Policy schedule or cover note.' },
  { type: 'Repair estimate', title: 'Repair estimate', body: 'Garage estimate or initial assessment.' },
];

export default function UploadDocumentsScreen() {
  const router = useRouter();
  const { claimId } = useLocalSearchParams<{ claimId?: string }>();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState(claimId ?? '');
  const [files, setFiles] = useState<Record<string, PickedFile | null>>({});
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingType, setUploadingType] = useState('');

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const customer = await getCustomerForUser(session.user.id);
      if (customer) {
        const [claimsResult, documentsResult] = await Promise.all([
          supabase.from('claims').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
          supabase.from('claim_documents').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        ]);
        const nextClaims = claimsResult.data ?? [];
        setClaims(nextClaims);
        setDocuments(documentsResult.data ?? []);
        if (claimId) setSelectedClaimId(claimId);
        else if (nextClaims.length === 1) setSelectedClaimId(nextClaims[0].id);
      }
    }
    void load();
  }, [claimId, router]);

  const selectedClaim = useMemo(() => claims.find((item) => item.id === selectedClaimId) ?? null, [claims, selectedClaimId]);
  const selectedDocuments = useMemo(() => selectedClaim ? documents.filter((item) => item.claim_id === selectedClaim.id) : [], [documents, selectedClaim]);

  async function takePhoto(documentType: string) {
    setMessage('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFiles((current) => ({ ...current, [documentType]: { uri: asset.uri, name: asset.fileName ?? `${slug(documentType)}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize ?? null } }));
    }
  }

  async function choosePhoto(documentType: string) {
    setMessage('');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFiles((current) => ({ ...current, [documentType]: { uri: asset.uri, name: asset.fileName ?? `${slug(documentType)}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize ?? null } }));
    }
  }

  async function pickDocument(documentType: string) {
    setMessage('');
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFiles((current) => ({ ...current, [documentType]: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, size: asset.size ?? null } }));
    }
  }

  async function upload(documentType: string) {
    setMessage('');
    setSuccess('');
    setUploadingType(documentType);
    try {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const customer = await ensureCustomerForUser(session.user);
      const file = files[documentType];
      if (!customer) return setMessage('Your customer profile is not ready yet. Please contact support.');
      if (!selectedClaim || !file) return setMessage('Select a claim and attach a file.');

      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const storagePath = `${customer.id}/${selectedClaim.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const response = await fetch(file.uri);
      const body = await response.arrayBuffer();
      const uploadResult = await supabase.storage.from('claim-documents').upload(storagePath, body, { contentType: file.mimeType ?? 'application/octet-stream', upsert: false });
      if (uploadResult.error) return setMessage('This file could not be uploaded.');
      const { data, error } = await supabase.from('claim_documents').insert({
        claim_id: selectedClaim.id,
        customer_id: customer.id,
        document_type: documentType,
        file_name: file.name,
        storage_bucket: 'claim-documents',
        storage_path: storagePath,
        mime_type: file.mimeType,
        file_size: file.size,
        uploaded_by: session.user.id,
      }).select('*').single();
      if (error) setMessage('The file uploaded, but the document record could not be saved.');
      else {
        setSuccess(`${documentType} uploaded.`);
        if (data) setDocuments((current) => [data, ...current]);
        setFiles((current) => ({ ...current, [documentType]: null }));
      }
    } catch {
      setMessage('This file could not be uploaded.');
    } finally {
      setUploadingType('');
    }
  }

  async function openDocument(document: ClaimDocument) {
    setMessage('');
    const { data, error } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 300);
    if (error || !data?.signedUrl) return setMessage('This document could not be opened.');
    await Linking.openURL(data.signedUrl);
  }

  return (
    <Screen title="Claim Documents" subtitle="Attach the files needed for this claim.">
      {message ? <Message type="error">{message}</Message> : null}
      {success ? <Message type="success">{success}</Message> : null}
      <Card>
        <AppSectionHeader title="Claim" />
        <AppSearchSelect
          label="Claim number"
          placeholder="Search claim"
          options={claims}
          selectedId={selectedClaimId}
          onSelect={(claim) => setSelectedClaimId(claim.id)}
          getTitle={(claim) => claim.claim_no}
          getSubtitle={(claim) => [claim.current_status, claim.created_at?.slice(0, 10)].filter(Boolean).join(' | ')}
        />
        {selectedClaim ? <AppBadge label={selectedClaim.current_status} tone="info" /> : null}
      </Card>

      {documentSections.map((section) => {
        const file = files[section.type];
        const uploaded = selectedDocuments.filter((item) => item.document_type === section.type);
        const isComplete = uploaded.length > 0;
        return (
          <Card key={section.type} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{isComplete ? uploaded[0].file_name : section.body}</Text>
              </View>
              {isComplete ? <AppBadge label="Uploaded" tone="success" /> : null}
            </View>
            {!isComplete ? (
              <>
                <View style={styles.actions}>
                  <CompactButton label="Camera" onPress={() => void takePhoto(section.type)} />
                  <CompactButton label="Gallery" onPress={() => void choosePhoto(section.type)} />
                  <CompactButton label="File" onPress={() => void pickDocument(section.type)} />
                </View>
                {file ? <Row label="Selected file" value={file.name} /> : null}
                {file ? <Button label={uploadingType === section.type ? 'Uploading...' : 'Upload'} onPress={() => void upload(section.type)} disabled={uploadingType === section.type} /> : null}
              </>
            ) : null}
            {uploaded.map((document) => (
              <Fragment key={document.id}>
                <View style={styles.uploadedRow}>
                  <Text style={styles.uploadedMeta}>{document.verification_status}</Text>
                  <CompactButton label="Open" onPress={() => void openDocument(document)} />
                </View>
              </Fragment>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

function CompactButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.compactButton}>
      <Text style={styles.compactButtonText}>{label}</Text>
    </Pressable>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const styles = StyleSheet.create({
  documentCard: { padding: 12, borderRadius: 18, marginBottom: 9 },
  documentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  documentCopy: { flex: 1, minWidth: 0 },
  documentTitle: { color: '#0B1F3A', fontSize: 15, fontWeight: '900', marginBottom: 3 },
  sectionBody: { color: '#667085', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 7, marginTop: 10, marginBottom: 2 },
  compactButton: { minHeight: 34, flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  compactButtonText: { color: '#0B1F3A', fontSize: 12, fontWeight: '900' },
  uploadedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#D8DEE8', marginTop: 9, paddingTop: 9, gap: 10 },
  uploadedMeta: { color: '#667085', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
});
