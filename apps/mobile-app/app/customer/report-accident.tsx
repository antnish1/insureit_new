import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppDatePicker } from '@/components/design-system';
import { Message, Screen, TextField } from '@/components/ui';
import { ensureCustomerForUser, getCurrentSession, getCustomerForUser, makeClaimNumber } from '@/lib/auth';
import { recordClaimEvent } from '@/lib/claim-notifications';
import { supabase } from '@/lib/supabase';
import { palette, roleTheme } from '@/lib/theme';
import type { Customer, InsuranceCompany, Policy, Vehicle } from '@/lib/types';

export default function ReportAccidentScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [insurers, setInsurers] = useState<InsuranceCompany[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId ?? '');

  const [incidentDate, setIncidentDate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const [address1, setAddress1] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

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
        const [vehicleResult, policyResult, insurerResult] = await Promise.all([
          supabase.from('vehicles').select('*').eq('customer_id', customer.id).order('vehicle_no'),
          supabase.from('policies').select('*').eq('customer_id', customer.id).order('end_date', { ascending: false }),
          supabase.from('insurance_companies').select('*'),
        ]);

        const nextVehicles = vehicleResult.data ?? [];
        setVehicles(nextVehicles);
        setPolicies(policyResult.data ?? []);
        setInsurers(insurerResult.data ?? []);

        if (vehicleId && nextVehicles.some((vehicle) => vehicle.id === vehicleId)) {
          setSelectedVehicleId(vehicleId);
        } else if (!vehicleId && nextVehicles.length === 1) {
          setSelectedVehicleId(nextVehicles[0].id);
        }
      }
    }

    void load();
  }, [router, vehicleId]);

  const selectedVehicle = useMemo(() => vehicles.find((item) => item.id === selectedVehicleId) ?? null, [selectedVehicleId, vehicles]);

  const selectedPolicy = useMemo(() => {
    if (!selectedVehicle) return null;
    return policies.find((item) => item.vehicle_id === selectedVehicle.id) ?? null;
  }, [policies, selectedVehicle]);

  const selectedInsurer = useMemo(() => {
    if (!selectedPolicy) return null;
    return insurers.find((item) => item.id === selectedPolicy.insurance_company_id) ?? null;
  }, [insurers, selectedPolicy]);

  const addressText = buildAddress({ address1, street, city, stateName, pinCode });

  async function submit() {
    setMessage('');

    if (!selectedVehicle || !selectedPolicy) {
      setMessage('Vehicle and active policy details are required.');
      return;
    }

    if (!driverName.trim() || !driverPhone.trim()) {
      setMessage('Enter driver name and mobile number.');
      return;
    }

    const incidentAt = buildIncidentDate(incidentDate);
    if (!incidentAt) {
      setMessage('Select the incident date.');
      return;
    }

    if (!addressText) {
      setMessage('Enter the complete incident address.');
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
        current_status: 'Initial Documents Pending' as const,
        accident_at: incidentAt.toISOString(),
        accident_location: addressText || coordinatesToText(coordinates),
        accident_description: buildIncidentDescription({ driverName, driverPhone, coordinates }),
        estimated_loss: null,
        created_by: session.user.id,
      };

      const { data: claim, error } = await supabase.from('claims').insert(payload).select('*').single();

      if (error || !claim) {
        setMessage(mapSubmitError(error));
        return;
      }

      try {
        await recordClaimEvent({
          claimId: claim.id,
          customerId: claim.customer_id,
          fromStatus: null,
          toStatus: claim.current_status,
          notes: 'New incident claim reported by customer.',
          changedBy: session.user.id,
          title: `New claim ${claim.claim_no}`,
        });
      } catch (eventError) {
        console.warn('Claim event logging skipped after customer claim creation', eventError);
      }

      router.replace({ pathname: '/customer/upload-documents', params: { claimId: claim.id } });
    } catch (error) {
      console.error('Report incident submit failed', { error, customer });
      setMessage('We could not submit the incident report right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function captureLocation() {
    setLocationMessage('');
    setLoadingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('Location permission not available. Please enter address manually.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(nextCoordinates);

      const address = await reverseGeocode(nextCoordinates.latitude, nextCoordinates.longitude);
      if (address) {
        setAddress1(address.address1);
        setStreet(address.street);
        setCity(address.city);
        setStateName(address.state);
        setPinCode(address.pinCode);
        setLocationMessage('GPS location fetched. Please verify the address before submitting.');
      } else {
        setAddress1(coordinatesToText(nextCoordinates));
        setLocationMessage('GPS coordinates fetched. Please complete the address manually.');
      }
    } catch (error) {
      console.error('Report incident location capture failed', { error });
      setLocationMessage('Could not fetch GPS location. Please enter address manually.');
    } finally {
      setLoadingLocation(false);
    }
  }

  return (
    <Screen title="Report Incident" showTitleHeader={false}>
      <View style={styles.pageIndicator}>
        <Text style={styles.pageTitle}>Report Incident</Text>
        <Text style={styles.pageSub}>Vehicle, driver and incident address details</Text>
      </View>

      {message ? <Message type="error">{message}</Message> : null}

      {selectedVehicle ? (
        <View style={styles.vehicleSummary}>
          <View style={styles.summaryAccent} />

          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.vehicleNo}>{selectedVehicle.vehicle_no}</Text>
              <Text style={styles.vehicleMeta} numberOfLines={1}>{[selectedVehicle.make, selectedVehicle.model, selectedVehicle.vehicle_type].filter(Boolean).join(' • ') || 'Vehicle'}</Text>
            </View>

            <View style={[styles.policyStatus, selectedPolicy ? styles.policyStatusGood : styles.policyStatusBad]}>
              <Text style={[styles.policyStatusText, selectedPolicy ? styles.policyStatusTextGood : styles.policyStatusTextBad]}>{selectedPolicy ? 'Policy Active' : 'Policy Missing'}</Text>
            </View>
          </View>

          <View style={styles.summaryInfo}>
            <InfoPair leftLabel="Policy" leftValue={selectedPolicy?.policy_no ?? '-'} rightLabel="Expiry" rightValue={selectedPolicy ? formatDate(selectedPolicy.end_date) : '-'} />
            <InfoPair leftLabel="Insurer" leftValue={selectedInsurer?.name ?? '-'} rightLabel="Type" rightValue={selectedPolicy?.policy_type ?? '-'} />
          </View>
        </View>
      ) : (
        <View style={styles.vehicleMissing}>
          <MaterialCommunityIcons name="truck-alert-outline" size={28} color="#C83272" />
          <Text style={styles.vehicleMissingText}>Vehicle details are not available. Please go back and select a vehicle.</Text>
        </View>
      )}

      <View style={styles.formCard}>
        <SectionHeader icon="account-tie-outline" title="Driver Details" subtitle="Who was driving the vehicle?" />

        <View style={styles.fieldStack}>
          <TextField label="Driver Name" value={driverName} onChangeText={setDriverName} />
          <TextField label="Driver Mobile No." keyboardType="phone-pad" value={driverPhone} onChangeText={setDriverPhone} />
          <AppDatePicker label="Incident Date" value={incidentDate} onChange={setIncidentDate} formatDisplay={formatDisplayDate} />
        </View>
      </View>

      <View style={styles.formCard}>
        <SectionHeader icon="map-marker-radius-outline" title="Incident Address" subtitle="Enter complete address manually. GPS is optional." />

        {locationMessage ? <Message type="info">{locationMessage}</Message> : null}

        <View style={styles.addressMode}>
          <View style={styles.manualBadge}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.navy} />
            <Text style={styles.manualBadgeText}>Manual Entry</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={() => void captureLocation()} disabled={loadingLocation} style={styles.gpsButton}>
            <MaterialCommunityIcons name="crosshairs-gps" size={16} color={roleTheme.customer.accent} />
            <Text style={styles.gpsButtonText}>{loadingLocation ? 'Fetching...' : 'Fetch GPS Location'}</Text>
          </Pressable>
        </View>

        <View style={styles.fieldStack}>
          <TextField label="Address Line 1" value={address1} onChangeText={setAddress1} />
          <TextField label="Street / Area / Landmark" value={street} onChangeText={setStreet} />
          <View style={styles.twoColumn}>
            <View style={styles.halfField}>
              <TextField label="City" value={city} onChangeText={setCity} />
            </View>
            <View style={styles.halfField}>
              <TextField label="State" value={stateName} onChangeText={setStateName} />
            </View>
          </View>
          <TextField label="PIN Code" keyboardType="number-pad" value={pinCode} onChangeText={setPinCode} />
        </View>

        {addressText ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Formatted Address</Text>
            <Text style={styles.previewText}>{addressText}</Text>
          </View>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" onPress={submit} disabled={submitting} style={[styles.submitButton, submitting && styles.submitDisabled]}>
        <MaterialCommunityIcons name="file-send-outline" size={19} color="#FFFFFF" />
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Incident Report'}</Text>
      </Pressable>
    </Screen>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={21} color={palette.navy} />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function InfoPair({ leftLabel, leftValue, rightLabel, rightValue }: { leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }) {
  return (
    <View style={styles.infoPairRow}>
      <View style={styles.infoPairHalf}>
        <Text style={styles.infoPairText} numberOfLines={1}><Text style={styles.infoPairLabel}>{leftLabel}: </Text>{leftValue}</Text>
      </View>
      <View style={styles.infoPairHalf}>
        <Text style={styles.infoPairText} numberOfLines={1}><Text style={styles.infoPairLabel}>{rightLabel}: </Text>{rightValue}</Text>
      </View>
    </View>
  );
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!address) return null;

    return {
      address1: [address.name, address.streetNumber].filter(Boolean).join(', ') || address.street || '',
      street: [address.street, address.district].filter(Boolean).join(', '),
      city: address.city || address.subregion || '',
      state: address.region || '',
      pinCode: address.postalCode || '',
    };
  } catch (error) {
    console.error('Report incident reverse geocode failed', { error, latitude, longitude });
    return null;
  }
}

function buildAddress({ address1, street, city, stateName, pinCode }: { address1: string; street: string; city: string; stateName: string; pinCode: string }) {
  const firstPart = [address1.trim(), street.trim()].filter(Boolean).join(', ');
  const secondPart = [city.trim(), stateName.trim()].filter(Boolean).join(', ');
  const pinPart = pinCode.trim() ? `PIN ${pinCode.trim()}` : '';

  return [firstPart, secondPart, pinPart].filter(Boolean).join(', ');
}

function coordinatesToText(coordinates: { latitude: number; longitude: number } | null) {
  if (!coordinates) return '';
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

function buildIncidentDescription({ driverName, driverPhone, coordinates }: { driverName: string; driverPhone: string; coordinates: { latitude: number; longitude: number } | null }) {
  return [
    `Driver: ${driverName.trim()}`,
    `Driver phone: ${driverPhone.trim()}`,
    coordinates ? `GPS: ${coordinatesToText(coordinates)}` : '',
  ].filter(Boolean).join('\n');
}

function buildIncidentDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDisplayDate(value: string) {
  const parsed = buildIncidentDate(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapSubmitError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (message.toLowerCase().includes('violates row-level security') || code === '42501') return 'Your customer profile is not ready yet. Please contact support.';
  if (message.toLowerCase().includes('foreign key') || code === '23503') return 'Policy details are not available for this vehicle.';
  return 'We could not submit the incident report right now. Please try again.';
}

const styles = StyleSheet.create({
  pageIndicator: { marginTop: -18, marginBottom: 8 },
  pageTitle: { color: palette.navy, fontSize: 18, fontWeight: '900' },
  pageSub: { color: palette.slate, fontSize: 11.5, fontWeight: '800', marginTop: 2 },

  vehicleSummary: { backgroundColor: '#F8FBFF', borderWidth: 1, borderColor: '#CFE0FF', borderRadius: 16, padding: 12, paddingLeft: 16, marginBottom: 10, overflow: 'hidden', shadowColor: palette.ink, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  summaryAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: palette.navy },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  vehicleNo: { color: palette.ink, fontSize: 17, fontWeight: '900' },
  vehicleMeta: { color: palette.slate, fontSize: 11.5, fontWeight: '800', marginTop: 2 },
  policyStatus: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  policyStatusGood: { backgroundColor: '#E8F8F0' },
  policyStatusBad: { backgroundColor: '#FFF0F6' },
  policyStatusText: { fontSize: 9.7, fontWeight: '900' },
  policyStatusTextGood: { color: '#12805C' },
  policyStatusTextBad: { color: '#C83272' },
  summaryInfo: { marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5ECF5', gap: 4 },
  infoPairRow: { flexDirection: 'row', gap: 8 },
  infoPairHalf: { flex: 1, minWidth: 0 },
  infoPairText: { color: palette.ink, fontSize: 10.9, lineHeight: 15, fontWeight: '800' },
  infoPairLabel: { color: palette.slate, fontSize: 10.1, fontWeight: '900' },
  vehicleMissing: { borderRadius: 16, borderWidth: 1, borderColor: '#F8BFD7', backgroundColor: '#FFF8FB', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  vehicleMissingText: { flex: 1, color: palette.navy, fontSize: 12, lineHeight: 16, fontWeight: '800' },

  formCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8F4', borderRadius: 18, padding: 13, marginBottom: 10, shadowColor: palette.ink, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  sectionIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#EEF5FF', alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: palette.navy, fontSize: 14.5, fontWeight: '900' },
  sectionSub: { color: palette.slate, fontSize: 11, fontWeight: '700', marginTop: 2 },
  fieldStack: { gap: 8 },

  addressMode: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  manualBadge: { flex: 1, height: 38, borderRadius: 12, backgroundColor: '#EEF5FF', borderWidth: 1, borderColor: '#C7DAFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  manualBadgeText: { color: palette.navy, fontSize: 11.5, fontWeight: '900' },
  gpsButton: { flex: 1, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C7DAFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  gpsButtonText: { color: roleTheme.customer.accent, fontSize: 11.5, fontWeight: '900' },

  twoColumn: { flexDirection: 'row', gap: 8 },
  halfField: { flex: 1 },
  previewBox: { marginTop: 10, borderRadius: 13, borderWidth: 1, borderColor: '#C7DAFF', backgroundColor: '#F8FBFF', padding: 10 },
  previewLabel: { color: palette.slate, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.35 },
  previewText: { color: palette.ink, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 3 },

  submitButton: { height: 48, borderRadius: 15, backgroundColor: palette.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
