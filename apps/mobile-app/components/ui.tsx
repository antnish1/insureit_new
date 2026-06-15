import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, LinkProps, usePathname, useRouter } from 'expo-router';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, PressableProps, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentSession, getProfile, isValidProfile, routeForRole } from '@/lib/auth';
import type { AppRole } from '@/lib/types';

export const colors = {
  navy: '#0B1F3A',
  navySoft: '#173B68',
  green: '#18A058',
  grey: '#667085',
  lightGrey: '#EEF2F6',
  border: '#D8DEE8',
  white: '#FFFFFF',
  danger: '#B42318',
};

export function Screen({ title, subtitle, children, showLogout = false }: PropsWithChildren<{ title: string; subtitle?: string; showLogout?: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [profileInitial, setProfileInitial] = useState('I');
  const [profileRole, setProfileRole] = useState<AppRole | null>(null);
  const showProfile = ['/customer', '/it', '/staff', '/agent', '/hierarchy', '/admin'].some((prefix) => pathname.startsWith(prefix));
  void showLogout;

  useEffect(() => {
    let active = true;
    async function loadProfileInitial() {
      try {
        const session = await getCurrentSession();
        if (!session?.user || !active) return;
        const profile = await getProfile(session.user.id);
        if (!active) return;
        setProfileInitial(initialFor(profile?.full_name ?? session.user.email ?? 'InsureIT'));
        setProfileRole(isValidProfile(profile) ? profile.role : null);
      } catch {
        if (active) setProfileInitial('I');
      }
    }
    void loadProfileInitial();
    return () => {
      active = false;
    };
  }, []);

  function openProfile() {
    if (pathname.startsWith('/customer')) return router.push('/customer/profile');
    if (pathname.startsWith('/it')) return router.push('/it/profile');
    if (pathname.startsWith('/staff') || pathname.startsWith('/agent') || pathname.startsWith('/hierarchy') || pathname.startsWith('/admin')) return router.push('/staff/profile');
    return router.push('/login');
  }

  function openDashboard() {
    if (profileRole) return router.replace(routeForRole(profileRole));
    return router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {showProfile ? (
        <View style={styles.fixedBrandRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={25} color={colors.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openDashboard} style={styles.brandPressable}>
            <View style={styles.brandBadge}>
              <MaterialCommunityIcons name="shield-check" size={21} color={colors.navy} />
            </View>
            <Text style={styles.brand}>InsureIT</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openProfile} style={styles.avatar}>
            <Text style={styles.avatarText}>{profileInitial}</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView style={styles.screen} contentContainerStyle={[styles.screenContent, showProfile && styles.screenContentWithTabs]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!showProfile ? (
          <View style={styles.brandRow}>
          {showProfile ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={25} color={colors.navy} />
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={openDashboard} style={styles.brandPressable}>
            <View style={styles.brandBadge}>
              <MaterialCommunityIcons name="shield-check" size={21} color={colors.navy} />
            </View>
            <Text style={styles.brand}>InsureIT</Text>
          </Pressable>
          {showProfile ? (
            <Pressable accessibilityRole="button" onPress={openProfile} style={styles.avatar}>
              <Text style={styles.avatarText}>{profileInitial}</Text>
            </Pressable>
          ) : null}
          </View>
        ) : null}
        <View style={styles.header}>
          <View style={styles.headerGlow} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
      {showProfile && profileRole ? <BottomTabs role={profileRole} pathname={pathname} /> : null}
    </SafeAreaView>
  );
}

export function Card({ children, style, ...props }: PropsWithChildren<PressableProps>) {
  return <Pressable style={[styles.card, typeof style === 'function' ? undefined : style]} {...props}>{children}</Pressable>;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  const buttonStyle = [styles.button, variant === 'secondary' && styles.secondaryButton, variant === 'danger' && styles.dangerButton, disabled && styles.disabledButton];
  const textStyle = [styles.buttonText, variant === 'secondary' && styles.secondaryButtonText];
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={buttonStyle}>
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, style, editable, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, editable === false && styles.disabledInputShell]}>
        <TextInput placeholderTextColor="#8A94A6" editable={editable} style={[styles.input, style]} {...props} />
      </View>
    </View>
  );
}

export function Message({ type = 'info', children }: PropsWithChildren<{ type?: 'info' | 'error' | 'success' }>) {
  const icon = type === 'error' ? 'alert-circle-outline' : type === 'success' ? 'check-circle-outline' : 'information-outline';
  return (
    <View style={[styles.message, type === 'error' && styles.errorMessage, type === 'success' && styles.successMessage]}>
      <View style={styles.messageIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={type === 'error' ? colors.danger : type === 'success' ? '#067647' : '#0B63CE'} />
      </View>
      <Text style={[styles.messageText, type === 'error' && styles.errorMessageText, type === 'success' && styles.successMessageText]}>{children}</Text>
    </View>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <View style={styles.loadingBadge}>
        <ActivityIndicator color={colors.green} />
      </View>
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name="file-search-outline" size={22} color={colors.green} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.muted}>{body}</Text>
    </Card>
  );
}

export function Row({ label, value }: { label: string; value?: string | number | null }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value ?? '-'}</Text></View>;
}

export function NavLink({ href, label }: { href: LinkProps['href']; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.navLink}>
        <View style={styles.navIcon}>
          <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.green} />
        </View>
        <Text style={styles.navLinkText}>{label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={23} color="#667085" />
      </Pressable>
    </Link>
  );
}

function BottomTabs({ role, pathname }: { role: AppRole; pathname: string }) {
  const router = useRouter();
  const tabs = tabsForRole(role);
  return (
    <View style={styles.bottomTabsWrap}>
      <View style={styles.bottomTabs}>
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Pressable key={tab.href} accessibilityRole="button" onPress={() => router.push(tab.href as LinkProps['href'])} style={styles.bottomTab}>
              <MaterialCommunityIcons name={tab.icon} size={20} color={active ? colors.green : colors.grey} />
              <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]} numberOfLines={1}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function tabsForRole(role: AppRole): { label: string; href: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] {
  if (role === 'customer') return [
    { label: 'Home', href: '/customer/home', icon: 'home-variant' },
    { label: 'Claims', href: '/customer/claims', icon: 'file-document-check-outline' },
    { label: 'Vehicles', href: '/customer/vehicles', icon: 'truck-outline' },
    { label: 'Docs', href: '/customer/upload-documents', icon: 'cloud-upload-outline' },
    { label: 'Support', href: '/customer/support', icon: 'headset' },
  ];
  if (role === 'it_super_user' || role === 'admin' || role === 'super_admin') return [
    { label: 'Home', href: role === 'it_super_user' ? '/it/dashboard' : '/admin/dashboard', icon: 'home-variant' },
    { label: 'Users', href: '/it/users', icon: 'account-group-outline' },
    { label: 'Org', href: '/it/organization', icon: 'sitemap-outline' },
    { label: 'Claims', href: '/staff/claims', icon: 'file-document-check-outline' },
    { label: 'Docs', href: '/staff/documents', icon: 'cloud-upload-outline' },
  ];
  return [
    { label: 'Home', href: routeForRole(role), icon: 'home-variant' },
    { label: 'Claims', href: '/staff/claims', icon: 'file-document-check-outline' },
    { label: 'Docs', href: '/staff/documents', icon: 'cloud-upload-outline' },
    { label: 'Tasks', href: '/staff/tasks', icon: 'clipboard-check-outline' },
    { label: 'Customers', href: '/staff/customers', icon: 'account-box-outline' },
    { label: 'Vehicles', href: '/staff/vehicles', icon: 'truck-outline' },
  ];
}

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'I';
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightGrey },
  safeArea: { flex: 1, backgroundColor: colors.lightGrey },
  screenContent: { paddingHorizontal: 14, paddingBottom: 30 },
  screenContentWithTabs: { paddingTop: 122, paddingBottom: 104 },
  fixedBrandRow: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 66, paddingBottom: 12, backgroundColor: colors.lightGrey },
  brandRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: -14, paddingHorizontal: 14, paddingTop: 24, paddingBottom: 10, marginBottom: 10, backgroundColor: colors.lightGrey, zIndex: 10 },
  backButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  brandPressable: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  brand: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  header: { minHeight: 92, borderRadius: 22, backgroundColor: colors.navy, padding: 15, marginBottom: 12, overflow: 'hidden', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  headerGlow: { position: 'absolute', width: 154, height: 154, borderRadius: 77, right: -44, top: -58, backgroundColor: 'rgba(24,160,88,0.28)' },
  title: { color: colors.white, fontSize: 23, fontWeight: '900', lineHeight: 28 },
  subtitle: { color: '#C7D7EA', fontSize: 13, lineHeight: 18, marginTop: 5 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardTitle: { color: colors.navy, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  button: { minHeight: 46, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginVertical: 5, paddingHorizontal: 14, shadowColor: colors.green, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  secondaryButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 },
  dangerButton: { backgroundColor: colors.danger },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { color: colors.navy },
  fieldWrap: { marginBottom: 12 },
  label: { color: colors.navy, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  inputShell: { minHeight: 52, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  disabledInputShell: { opacity: 0.65 },
  input: { paddingHorizontal: 14, minHeight: 50, color: colors.navy, fontSize: 16, fontWeight: '600' },
  message: { backgroundColor: '#E8F1FB', borderRadius: 18, padding: 12, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#B9D5FF' },
  messageIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  messageText: { color: colors.navy, flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  errorMessage: { backgroundColor: '#FEEFEF', borderColor: '#FECACA' },
  successMessage: { backgroundColor: '#EAF8F0', borderColor: '#BFEBD0' },
  errorMessageText: { color: colors.danger },
  successMessageText: { color: '#067647' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 26 },
  loadingBadge: { width: 58, height: 58, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  loadingLabel: { color: colors.navy, fontSize: 15, fontWeight: '900', lineHeight: 22 },
  muted: { color: colors.grey, fontSize: 15, lineHeight: 22 },
  emptyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  row: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 },
  rowLabel: { color: colors.grey, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  rowValue: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  navLink: { backgroundColor: colors.white, borderRadius: 22, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  navIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  navLinkText: { color: colors.navy, fontSize: 16, fontWeight: '900', flex: 1 },
  bottomTabsWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingBottom: 8, backgroundColor: 'rgba(238,242,246,0.96)' },
  bottomTabs: { backgroundColor: colors.white, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 5, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: 0.09, shadowRadius: 12, elevation: 4 },
  bottomTab: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  bottomTabText: { color: colors.grey, fontSize: 9, fontWeight: '900' },
  bottomTabTextActive: { color: colors.navy },
});
