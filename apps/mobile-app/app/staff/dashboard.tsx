import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { AppGrid, AppStatCard } from '@/components/design-system';
import { LoadingState, Screen } from '@/components/ui';
import { getCurrentSession, getProfile, isValidProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Claim, Profile } from '@/lib/types';

export default function StaffDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [documentsPending, setDocumentsPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const nextProfile = await getProfile(session.user.id);
      if (!isValidProfile(nextProfile) || nextProfile.role === 'customer') return router.replace('/access-denied');
      setProfile(nextProfile);
      const [claimsResult, documentsResult] = await Promise.all([
        supabase.from('claims').select('*').order('updated_at', { ascending: false }),
        supabase.from('claim_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      ]);
      setClaims(claimsResult.data ?? []);
      setDocumentsPending(documentsResult.count ?? 0);
      setLoading(false);
    }
    void load();
  }, [router]);

  const counts = useMemo(() => ({
    total: claims.length,
    open: claims.filter((claim) => !['Settled', 'Rejected', 'Closed'].includes(claim.current_status)).length,
    approval: claims.filter((claim) => claim.current_status === 'Approval Pending').length,
    repair: claims.filter((claim) => ['Repair Started', 'Repair Completed', 'Final Bill Submitted'].includes(claim.current_status)).length,
    completed: claims.filter((claim) => ['Settled', 'Closed'].includes(claim.current_status)).length,
  }), [claims]);

  if (loading) return <Screen title="Operations Desk" showLogout><LoadingState label="Opening operations desk" /></Screen>;

  return (
    <Screen title="Operations Desk" subtitle={profile?.full_name ? profile.full_name : undefined} showLogout>
      <AppGrid>
        <AppStatCard label="Total claims" value={counts.total} icon="file-document-outline" tone="info" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Open claims" value={counts.open} icon="progress-clock" tone="warning" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Docs pending" value={documentsPending} icon="file-alert-outline" tone="danger" onPress={() => router.push('/staff/documents')} />
        <AppStatCard label="Approval" value={counts.approval} icon="shield-alert-outline" tone="warning" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Under repair" value={counts.repair} icon="wrench-outline" tone="info" onPress={() => router.push('/staff/claims')} />
        <AppStatCard label="Completed" value={counts.completed} icon="check-decagram-outline" tone="success" onPress={() => router.push('/staff/claims')} />
      </AppGrid>
    </Screen>
  );
}
