import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { AppGrid, AppScreen, AppSectionHeader, AppStatCard } from '@/components/design-system';
import { LoadingState, NavLink } from '@/components/ui';
import { getCurrentSession, getProfile, isValidProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Claim, Profile } from '@/lib/types';

type DashboardMode = 'agent' | 'hierarchy' | 'admin' | 'operations';

export function OperationsDashboard({ mode }: { mode: DashboardMode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [documentsPending, setDocumentsPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await getCurrentSession();
        if (!session?.user) return router.replace('/login');
        const nextProfile = await getProfile(session.user.id);
        if (!isValidProfile(nextProfile) || nextProfile.role === 'customer') return router.replace('/access-denied');
        const [claimsResult, documentsResult] = await Promise.all([
          supabase.from('claims').select('*').order('updated_at', { ascending: false }),
          supabase.from('claim_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        ]);
        if (!active) return;
        setProfile(nextProfile);
        setClaims(claimsResult.data ?? []);
        setDocumentsPending(documentsResult.count ?? 0);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const counts = useMemo(() => {
    const open = claims.filter((claim) => !['Settled', 'Rejected', 'Closed'].includes(claim.current_status)).length;
    return {
      total: claims.length,
      open,
      documentsPending,
      approvalPending: claims.filter((claim) => claim.current_status === 'Approval Pending').length,
      underRepair: claims.filter((claim) => ['Repair Started', 'Repair Completed', 'Final Bill Submitted'].includes(claim.current_status)).length,
      completed: claims.filter((claim) => ['Settled', 'Closed'].includes(claim.current_status)).length,
    };
  }, [claims, documentsPending]);

  if (loading) return <AppScreen title={dashboardTitle(mode)}><LoadingState label="Opening dashboard" /></AppScreen>;

  return (
    <AppScreen title={dashboardTitle(mode)} subtitle={profile?.full_name}>
      <AppGrid>
        <AppStatCard label="Total claims" value={counts.total} icon="file-document-outline" tone="info" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Open claims" value={counts.open} icon="progress-clock" tone="warning" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Docs pending" value={counts.documentsPending} icon="file-alert-outline" tone="danger" onPress={() => router.push('/staff/documents')} />
        <AppStatCard label="Approval" value={counts.approvalPending} icon="shield-alert-outline" tone="warning" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Under repair" value={counts.underRepair} icon="wrench-outline" tone="info" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Completed" value={counts.completed} icon="check-decagram-outline" tone="success" onPress={() => router.push('/staff/claims')} />
      </AppGrid>
      {profile?.role === 'manager' ? (
        <>
          <AppSectionHeader title="Add records" />
          <NavLink href="/staff/create-customer" label="Create customer" />
          <NavLink href="/staff/add-vehicle" label="Add vehicle" />
          <NavLink href="/staff/add-policy" label="Add policy" />
          <NavLink href="/staff/add-insurer" label="Add insurer" />
        </>
      ) : null}
      {mode === 'admin' ? <NavLink href="/it/users" label="User management" /> : null}
    </AppScreen>
  );
}

function dashboardTitle(mode: DashboardMode) {
  if (mode === 'agent') return 'Agent Desk';
  if (mode === 'hierarchy') return 'Hierarchy Desk';
  if (mode === 'admin') return 'Admin Desk';
  return 'Operations Desk';
}
