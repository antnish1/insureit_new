import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSearchSelect, AppSectionHeader } from '@/components/design-system';
import { Button, Card, Message, Row, Screen, TextField, colors } from '@/components/ui';
import { ensureCustomerForUser, getCurrentSession, getCustomerForUser, makeClaimNumber } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Customer, Policy, Vehicle } from '@/lib/types';

type PickedPhoto = { uri: string; name: string; mimeType: string | null; size: number | null };

export default function ReportAccidentScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [accidentAt, setAccidentAt] = useState(() => new Date());
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [message, setMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const customer = await getCustomerForUser(session.user.id);
      if (customer) {
        const [vehicleResult, policyResult] = await Promise.all([
          supabase.from('vehicles').select('*').eq('customer_id', customer.id).order('vehicle_no'),
          supabase.from('policies').select('*').eq('customer_id', customer.id).order('end_date', { ascending: false }),
        ]);
        const nextVehicles = vehicleResult.data ?? [];
        setVehicles(nextVehicles);
        setPolicies(policyResult.data ?? []);
        if (nextVehicles.length === 1) setSelectedVehicleId(nextVehicles[0].id);
      }
    }
    void load();
    setAccidentAt(new Date());
    void captureLocation();
  }, [router]);

  const selectedVehicle = useMemo(() => vehicles.find((item) => item.id === selectedVehicleId) ?? null, [selectedVehicleId, vehicles]);
  const selectedPolicy = useMemo(() => {
    if (!selectedVehicle) return null;
    return policies.find((item) => item.vehicle_id === selectedVehicle.id) ?? null;
  }, [policies, selectedVehicle]);

  function selectVehicle(vehicle: Vehicle) {
    setSelectedVehicleId(vehicle.id);
    const linkedPolicy = policies.find((item) => item.vehicle_id === vehicle.id);
    if (!linkedPolicy) setMessage('Policy details are not available for this vehicle.');
    else setMessage('');
  }

  async function takePhoto() {
    setMessage('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      setMessage('Camera permission is required to take a vehicle photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoFromAsset(result.assets[0], 'vehicle-photo');
  }

  async function choosePhoto() {
    setMessage('');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoFromAsset(result.assets[0], 'vehicle-photo');
  }

  async function submit() {
    setMessage('');
    if (!selectedVehicle || !selectedPolicy) {
      setMessage('Select a vehicle with active policy details.');
      return;
    }
    if (!photo) {
      setMessage('Add a vehicle photo to continue.');
      return;
    }
    setSubmitting(true);
    let customer: Customer | null = null;
    try {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      customer = await ensureCustomerForUser(session.user);
      if (!customer) {
        setMessage('Your customer profile is not ready yet. Please contact support.');
        return;
      }

      const payload = {
        claim_no: makeClaimNumber(),
        customer_id: customer.id,
        vehicle_id: selectedVehicle.id,
        policy_id: selectedPolicy.id,
        insurance_company_id: selectedPolicy.insurance_company_id,
        current_status: 'Accident Reported' as const,
        accident_at: accidentAt.toISOString(),
        accident_location: location.trim() || coordinatesToText(coordinates),
        accident_description: description.trim(),
        estimated_loss: null,
        created_by: session.user.id,
      };
      const { data: claim, error } = await supabase.from('claims').insert(payload).select('*').single();
      if (error || !claim) {
        setMessage(mapSubmitError(error));
        return;
      }
      await uploadClaimFile({ customerId: customer.id, claimId: claim.id, file: photo, documentType: 'Vehicle photo', uploadedBy: session.user.id });
      router.replace({ pathname: '/customer/upload-documents', params: { claimId: claim.id } });
    } catch (error) {
      console.error('Report accident submit failed', { error, customer });
      setMessage('We could not submit the accident report right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="Report Accident" subtitle="Capture the accident and linked policy details.">
      <Card>
        {message ? <Message type="error">{message}</Message> : null}
        <AppSectionHeader title="Vehicle" />
        <AppSearchSelect
          label="Vehicle number"
          placeholder="Search your vehicle"
          options={vehicles}
          selectedId={selectedVehicleId}
          onSelect={selectVehicle}
          getTitle={(vehicle) => vehicle.vehicle_no}
          getSubtitle={(vehicle) => [vehicle.make, vehicle.model, vehicle.vehicle_type].filter(Boolean).join(' | ')}
        />
        <Row label="Policy number" value={selectedPolicy?.policy_no} />
        <Row label="Policy period" value={selectedPolicy ? `${formatDate(selectedPolicy.start_date)} to ${formatDate(selectedPolicy.end_date)}` : null} />
      </Card>
      <Card>
        <AppSectionHeader title="Accident" />
        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Accident date and time</Text>
          <Text style={styles.readOnlyValue}>{formatAccidentDate(accidentAt)}</Text>
        </View>
        {locationMessage ? <Message type="info">{locationMessage}</Message> : null}
        <TextField label="Location" value={location} onChangeText={setLocation} />
        <Pressable accessibilityRole="button" onPress={() => void captureLocation()} disabled={loadingLocation} style={styles.refreshLocationButton}>
          <Text style={styles.refreshLocationText}>{loadingLocation ? 'Capturing location...' : 'Refresh location'}</Text>
        </Pressable>
        <TextField label="What happened" value={description} onChangeText={setDescription} multiline />
      </Card>
      <Card>
        <AppSectionHeader title="Vehicle photo" />
        <View style={styles.photoActions}>
          <Button label="Open camera" variant="secondary" onPress={() => void takePhoto()} />
          <Button label="Choose photo" variant="secondary" onPress={() => void choosePhoto()} />
        </View>
        <Row label="Selected photo" value={photo?.name} />
        <Button label={submitting ? 'Saving claim...' : 'Continue'} onPress={submit} disabled={submitting} />
      </Card>
    </Screen>
  );

  async function captureLocation() {
    setLocationMessage('');
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('Enter the location manually.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(nextCoordinates);
      const address = await reverseGeocode(nextCoordinates.latitude, nextCoordinates.longitude);
      setLocation(address || coordinatesToText(nextCoordinates));
    } catch (error) {
      console.error('Report accident location capture failed', { error });
      setLocationMessage('Enter the location manually.');
    } finally {
      setLoadingLocation(false);
    }
  }

  function setPhotoFromAsset(asset: ImagePicker.ImagePickerAsset, fallbackName: string) {
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? null,
    });
  }
}

async function uploadClaimFile({ customerId, claimId, file, documentType, uploadedBy }: { customerId: string; claimId: string; file: PickedPhoto; documentType: string; uploadedBy: string }) {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const storagePath = `${customerId}/${claimId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(file.uri);
  const body = await response.arrayBuffer();
  const uploadResult = await supabase.storage.from('claim-documents').upload(storagePath, body, { contentType: file.mimeType ?? 'image/jpeg', upsert: false });
  if (uploadResult.error) throw uploadResult.error;
  const { error } = await supabase.from('claim_documents').insert({
    claim_id: claimId,
    customer_id: customerId,
    document_type: documentType,
    file_name: file.name,
    storage_bucket: 'claim-documents',
    storage_path: storagePath,
    mime_type: file.mimeType,
    file_size: file.size,
    uploaded_by: uploadedBy,
  });
  if (error) throw error;
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!address) return '';
    return [address.name, address.street, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(', ');
  } catch (error) {
    console.error('Report accident reverse geocode failed', { error, latitude, longitude });
    return '';
  }
}

function coordinatesToText(coordinates: { latitude: number; longitude: number } | null) {
  if (!coordinates) return '';
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

function formatAccidentDate(date: Date) {
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapSubmitError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (message.toLowerCase().includes('violates row-level security') || code === '42501') return 'Your customer profile is not ready yet. Please contact support.';
  if (message.toLowerCase().includes('foreign key') || code === '23503') return 'Policy details are not available for this vehicle.';
  return 'We could not submit the accident report right now. Please try again.';
}

const styles = StyleSheet.create({
  readOnlyField: { marginBottom: 12 },
  label: { color: colors.navy, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  readOnlyValue: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFC', color: colors.navy, fontSize: 16, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 14 },
  refreshLocationButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: '#B9D5FF', backgroundColor: '#E8F1FB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: -4, marginBottom: 12 },
  refreshLocationText: { color: '#0B63CE', fontSize: 13, fontWeight: '800' },
  photoActions: { gap: 2, marginBottom: 8 },
});
