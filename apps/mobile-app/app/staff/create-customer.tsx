import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { AppSearchSelect, AppSectionHeader } from '@/components/design-system';
import { Button, Card, LoadingState, Message, Row, Screen, TextField } from '@/components/ui';
import { getCurrentSession, getProfile, isValidProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AgentOption = Pick<Profile, 'id' | 'full_name' | 'employee_code' | 'role' | 'is_active'>;

export default function StaffCreateCustomerScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession();
      if (!session?.user) return router.replace('/login');
      const profile = await getProfile(session.user.id);
      if (!isValidProfile(profile) || !['manager', 'admin', 'super_admin', 'it_super_user'].includes(profile.role)) return router.replace('/access-denied');
      const { data, error } = await supabase.functions.invoke<{ assignable_agents: AgentOption[] }>('profile-context', { method: 'GET' });
      if (error) throw error;
      const nextAgents = data?.assignable_agents ?? [];
      setAgents(nextAgents);
      if (nextAgents.length === 1) setSelectedAgentId(nextAgents[0].id);
      setLoading(false);
    }
    void load();
  }, [router]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

  async function save() {
    setMessage('');
    setSuccess('');
    if (!fullName.trim() || !email.trim() || !password || !phone.trim() || !selectedAgentId) {
      setMessage('Customer name, email, password, phone, and assigned agent are required.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: 'customer',
          phone: phone.trim(),
          reporting_manager_id: selectedAgentId,
          customer: {
            contact_name: fullName.trim(),
            company_name: nullable(companyName),
            phone: phone.trim(),
            email: email.trim(),
            address: nullable(address),
            city: nullable(city),
            state: nullable(state),
            postal_code: nullable(postalCode),
            assigned_agent_id: selectedAgentId,
          },
        },
      });
      if (error) throw error;
      setSuccess(`Customer created${data?.email ? `: ${data.email}` : ''}.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setCompanyName('');
      setAddress('');
      setCity('');
      setState('');
      setPostalCode('');
    } catch (error) {
      console.error('Manager customer creation failed', error);
      setMessage('We could not create this customer. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen title="Create Customer"><LoadingState label="Loading agents" /></Screen>;

  return (
    <Screen title="Create Customer" subtitle="Create a customer login and link it below an agent.">
      {message ? <Message type="error">{message}</Message> : null}
      {success ? <Message type="success">{success}</Message> : null}
      <Card>
        <AppSectionHeader title="Customer login" />
        <TextField label="Customer name" value={fullName} onChangeText={setFullName} />
        <TextField label="Customer email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Temporary password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Card>
      <Card>
        <AppSectionHeader title="Assigned agent" />
        <AppSearchSelect
          label="Agent"
          placeholder="Search agent by name or code"
          options={agents}
          selectedId={selectedAgentId}
          onSelect={(agent) => setSelectedAgentId(agent.id)}
          getTitle={(agent) => agent.full_name}
          getSubtitle={(agent) => agent.employee_code ?? 'Agent'}
        />
        <Row label="Selected agent" value={selectedAgent?.full_name} />
      </Card>
      <Card>
        <AppSectionHeader title="Customer details" />
        <TextField label="Company name" value={companyName} onChangeText={setCompanyName} />
        <TextField label="Address" value={address} onChangeText={setAddress} />
        <TextField label="City" value={city} onChangeText={setCity} />
        <TextField label="State" value={state} onChangeText={setState} />
        <TextField label="Postal code" value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
        <Button label={saving ? 'Creating customer...' : 'Create customer'} onPress={save} disabled={saving || !agents.length} />
      </Card>
    </Screen>
  );
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
