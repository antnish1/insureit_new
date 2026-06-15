import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppSearchSelect, AppSectionHeader } from '@/components/design-system';
import { Button, Card, LoadingState, Message, Row, Screen, TextField } from '@/components/ui';
import { getCurrentSession, getProfile, isValidProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';

export default function StaffAddVehicleScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('Commercial Vehicle');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const profile = await getProfile(session.user.id);
      if (!isValidProfile(profile) || profile.role !== 'manager') return router.replace('/access-denied');
      const { data } = await supabase.from('customers').select('*').order('contact_name');
      setCustomers(data ?? []);
      setLoading(false);
    }
    void load();
  }, [router]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  async function save() {
    setMessage('');
    setSuccess('');
    if (!selectedCustomer || !vehicleNo.trim() || !vehicleType.trim()) {
      setMessage('Customer, vehicle number, and vehicle type are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        customer_id: selectedCustomer.id,
        vehicle_no: vehicleNo.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        make: nullable(make),
        model: nullable(model),
        year: year ? Number(year) : null,
      });
      if (error) throw error;
      setSuccess('Vehicle added to customer profile.');
      setVehicleNo('');
      setMake('');
      setModel('');
      setYear('');
    } catch (error) {
      console.error('Manager add vehicle failed', error);
      setMessage('We could not save this vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen title="Add Vehicle"><LoadingState label="Loading customers" /></Screen>;

  return (
    <Screen title="Add Vehicle" subtitle="Add a vehicle record to a customer profile.">
      {message ? <Message type="error">{message}</Message> : null}
      {success ? <Message type="success">{success}</Message> : null}
      <Card>
        <AppSectionHeader title="Customer" />
        <AppSearchSelect
          label="Customer"
          placeholder="Search customer by name, phone, code"
          options={customers}
          selectedId={selectedCustomerId}
          onSelect={(customer) => setSelectedCustomerId(customer.id)}
          getTitle={(customer) => customer.contact_name}
          getSubtitle={(customer) => [customer.company_name, customer.phone, customer.customer_code].filter(Boolean).join(' | ')}
        />
        <Row label="Selected customer" value={selectedCustomer?.contact_name} />
      </Card>
      <Card>
        <AppSectionHeader title="Vehicle" />
        <TextField label="Vehicle number" value={vehicleNo} onChangeText={setVehicleNo} autoCapitalize="characters" />
        <TextField label="Vehicle type" value={vehicleType} onChangeText={setVehicleType} />
        <TextField label="Make" value={make} onChangeText={setMake} />
        <TextField label="Model" value={model} onChangeText={setModel} />
        <TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" />
        <Button label={saving ? 'Saving vehicle...' : 'Save vehicle'} onPress={save} disabled={saving} />
      </Card>
    </Screen>
  );
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
