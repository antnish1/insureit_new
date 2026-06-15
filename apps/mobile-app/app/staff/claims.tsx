import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSearchBar } from '@/components/design-system';
import { Card, EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { claimStatuses } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Claim, Customer, Vehicle } from '@/lib/types';

export default function StaffClaimsScreen() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [claimsResult, customersResult, vehiclesResult] = await Promise.all([
        supabase.from('claims').select('*').order('created_at', { ascending: false }).limit(75),
        supabase.from('customers').select('*'),
        supabase.from('vehicles').select('*'),
      ]);
      setClaims(claimsResult.data ?? []);
      setCustomers(customersResult.data ?? []);
      setVehicles(vehiclesResult.data ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const filteredClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return claims.filter((claim) => {
      const customer = customers.find((item) => item.id === claim.customer_id);
      const vehicle = vehicles.find((item) => item.id === claim.vehicle_id);
      const haystack = [claim.claim_no, claim.current_status, customer?.contact_name, customer?.company_name, vehicle?.vehicle_no].filter(Boolean).join(' ').toLowerCase();
      return (!normalizedQuery || haystack.includes(normalizedQuery)) && (statusFilter === 'All' || claim.current_status === statusFilter);
    });
  }, [claims, customers, query, statusFilter, vehicles]);

  if (loading) return <Screen title="Claims List"><LoadingState /></Screen>;

  return (
    <Screen title="Claims List" showLogout>
      <AppSearchBar value={query} onChangeText={setQuery} placeholder="Search claim, customer, vehicle" />
      <Card>
        <Row label="Status filter" value={statusFilter} />
        <View style={styles.filterWrap}>
          {['All', ...claimStatuses].map((status) => (
            <Pressable key={status} accessibilityRole="button" onPress={() => setStatusFilter(status)} style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}>
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {claims.length === 0 ? <EmptyState title="No claims found" body="Submitted claims will appear here for review." /> : filteredClaims.map((claim) => {
        const customer = customers.find((item) => item.id === claim.customer_id);
        const vehicle = vehicles.find((item) => item.id === claim.vehicle_id);
        return (
        <Link key={claim.id} href={{ pathname: '/staff/claim-detail', params: { id: claim.id } }} asChild>
          <Card>
            <Row label="Claim number" value={claim.claim_no} />
            <Row label="Customer" value={customer?.contact_name ?? customer?.company_name} />
            <Row label="Vehicle" value={vehicle?.vehicle_no} />
            <Row label="Status" value={claim.current_status} />
            <Row label="Assigned" value={claim.assigned_to ? 'Assigned' : 'Unassigned'} />
            <Row label="Last update" value={formatDateTime(claim.updated_at ?? claim.created_at)} />
          </Card>
        </Link>
      );})}
      {claims.length > 0 && filteredClaims.length === 0 ? <EmptyState title="No matching claims" body="Adjust the search or status filter." /> : null}
    </Screen>
  );
}

function formatDateTime(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  filterChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#D8DEE8' },
  filterChipActive: { backgroundColor: '#E8F1FB', borderColor: '#B9D5FF' },
  filterText: { color: '#667085', fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: '#0B63CE' },
});
