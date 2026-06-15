import { Link } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, EmptyState, Row, Screen, TextField } from '@/components/ui';
import { getCurrentSession, getProfile, isValidProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Customer, Profile } from '@/lib/types';

export default function CustomerSearchScreen() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const session = await getCurrentSession();
      if (!session?.user) return;
      const nextProfile = await getProfile(session.user.id);
      if (isValidProfile(nextProfile)) setProfile(nextProfile);
    }
    void loadProfile();
  }, []);

  async function search() {
    setSearched(true);
    const term = `%${query.trim()}%`;
    const { data } = await supabase.from('customers').select('*').or(`contact_name.ilike.${term},phone.ilike.${term},customer_code.ilike.${term},company_name.ilike.${term}`).limit(25);
    setCustomers(data ?? []);
  }

  return (
    <Screen title="Customer Search" showLogout>
      {profile?.role === 'manager' ? (
        <Card>
          <Link href="/staff/create-customer" asChild><Button label="Create customer" onPress={() => undefined} /></Link>
          <Link href="/staff/add-vehicle" asChild><Button label="Add vehicle" variant="secondary" onPress={() => undefined} /></Link>
          <Link href="/staff/add-policy" asChild><Button label="Add policy" variant="secondary" onPress={() => undefined} /></Link>
        </Card>
      ) : null}
      <Card>
        <TextField label="Name, phone, company, or customer code" value={query} onChangeText={setQuery} />
        <Button label="Search customers" onPress={search} />
      </Card>
      {searched && customers.length === 0 ? <EmptyState title="No customers found" body="Try a different name, phone number, or customer code." /> : customers.map((customer) => (
        <Card key={customer.id}>
          <Row label="Customer" value={customer.contact_name} />
          <Row label="Company" value={customer.company_name} />
          <Row label="Phone" value={customer.phone} />
          <Row label="Code" value={customer.customer_code} />
        </Card>
      ))}
    </Screen>
  );
}
