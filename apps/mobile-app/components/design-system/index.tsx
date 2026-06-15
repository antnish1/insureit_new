import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PropsWithChildren, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Button, Card, EmptyState, LoadingState, Message, Screen, colors } from '@/components/ui';

export const AppScreen = Screen;
export const AppCard = Card;
export const AppButton = Button;
export const AppEmptyState = EmptyState;
export const AppLoadingState = LoadingState;
export const AppMessage = Message;

export function AppInput({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={designStyles.inputWrap}>
      {label ? <Text style={designStyles.label}>{label}</Text> : null}
      <TextInput {...props} placeholderTextColor="#8A94A6" style={[designStyles.input, style]} />
    </View>
  );
}

export function AppBadge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const toneStyle = {
    success: designStyles.badgeSuccess,
    warning: designStyles.badgeWarning,
    danger: designStyles.badgeDanger,
    info: designStyles.badgeInfo,
    neutral: designStyles.badgeNeutral,
  }[tone];
  const textStyle = {
    success: designStyles.badgeSuccessText,
    warning: designStyles.badgeWarningText,
    danger: designStyles.badgeDangerText,
    info: designStyles.badgeInfoText,
    neutral: designStyles.badgeNeutralText,
  }[tone];
  return <View style={[designStyles.badge, toneStyle]}><Text style={[designStyles.badgeText, textStyle]}>{label}</Text></View>;
}

export function AppSectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={designStyles.sectionHeader}>
      <Text style={designStyles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={designStyles.sectionAction}>
          <Text style={designStyles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppStatCard({ label, value, icon, tone = 'info', onPress }: { label: string; value: string | number; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; onPress?: () => void }) {
  const iconColor = tone === 'success' ? colors.green : tone === 'warning' ? '#F79009' : tone === 'danger' ? colors.danger : '#0B63CE';
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={designStyles.statCard}>
      <View style={designStyles.statTop}>
        <View style={[designStyles.statIcon, { backgroundColor: toneBackground(tone) }]}>
          <MaterialCommunityIcons name={icon} size={21} color={iconColor} />
        </View>
        <Text style={designStyles.statValue}>{value}</Text>
      </View>
      <Text style={designStyles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function AppTimeline({ steps }: { steps: { label: string; state: 'complete' | 'current' | 'pending'; meta?: string }[] }) {
  return (
    <View style={designStyles.timeline}>
      {steps.map((step, index) => (
        <View key={`${step.label}-${index}`} style={designStyles.timelineRow}>
          <View style={designStyles.timelineRail}>
            <View style={[designStyles.timelineDot, step.state === 'complete' && designStyles.timelineDotComplete, step.state === 'current' && designStyles.timelineDotCurrent]}>
              {step.state === 'complete' ? <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" /> : null}
            </View>
            {index < steps.length - 1 ? <View style={[designStyles.timelineLine, step.state === 'complete' && designStyles.timelineLineComplete]} /> : null}
          </View>
          <View style={designStyles.timelineCopy}>
            <Text style={[designStyles.timelineTitle, step.state === 'current' && designStyles.timelineTitleCurrent]}>{step.label}</Text>
            {step.meta ? <Text style={designStyles.timelineMeta}>{step.meta}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function AppAvatar({ label }: { label: string }) {
  return <View style={designStyles.avatar}><Text style={designStyles.avatarText}>{label.trim().charAt(0).toUpperCase() || 'I'}</Text></View>;
}

export function AppSearchBar({ value, onChangeText, placeholder = 'Search' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View style={designStyles.searchBar}>
      <MaterialCommunityIcons name="magnify" size={21} color="#667085" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8A94A6" style={designStyles.searchInput} />
    </View>
  );
}

export function AppSearchSelect<T extends { id: string }>({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  getTitle,
  getSubtitle,
}: {
  label: string;
  placeholder: string;
  options: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return options
      .filter((item) => {
        const searchable = [getTitle(item), getSubtitle?.(item)].filter(Boolean).join(' ').toLowerCase();
        return !term || searchable.includes(term);
      })
      .slice(0, 8);
  }, [getSubtitle, getTitle, options, query]);

  return (
    <View style={designStyles.selectWrap}>
      <Text style={designStyles.label}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={designStyles.selectButton}>
        <View style={designStyles.selectCopy}>
          <Text style={[designStyles.selectTitle, !selected && designStyles.selectPlaceholder]} numberOfLines={1}>{selected ? getTitle(selected) : placeholder}</Text>
          {selected && getSubtitle ? <Text style={designStyles.selectSubtitle} numberOfLines={1}>{getSubtitle(selected)}</Text> : null}
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color="#667085" />
      </Pressable>
      {open ? (
        <View style={designStyles.dropdownPanel}>
          <View style={designStyles.dropdownSearch}>
            <MaterialCommunityIcons name="magnify" size={19} color="#667085" />
            <TextInput value={query} onChangeText={setQuery} placeholder={placeholder} placeholderTextColor="#8A94A6" style={designStyles.dropdownInput} />
          </View>
          {filtered.length ? filtered.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => { onSelect(item); setQuery(''); setOpen(false); }} style={[designStyles.dropdownOption, selectedId === item.id && designStyles.dropdownOptionActive]}>
              <Text style={[designStyles.dropdownTitle, selectedId === item.id && designStyles.dropdownTitleActive]} numberOfLines={1}>{getTitle(item)}</Text>
              {getSubtitle ? <Text style={designStyles.dropdownSubtitle} numberOfLines={1}>{getSubtitle(item)}</Text> : null}
            </Pressable>
          )) : (
            <Text style={designStyles.dropdownEmpty}>No matching records</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function AppDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parseDate(value) ?? new Date()));
  const selectedDate = parseDate(value);
  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <View style={designStyles.selectWrap}>
      <Text style={designStyles.label}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={designStyles.selectButton}>
        <View style={designStyles.selectCopy}>
          <Text style={[designStyles.selectTitle, !value && designStyles.selectPlaceholder]}>{value ? formatReadableDate(value) : 'Select date'}</Text>
          {value ? <Text style={designStyles.selectSubtitle}>{value}</Text> : null}
        </View>
        <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#667085" />
      </Pressable>
      {open ? (
        <View style={designStyles.calendarPanel}>
          <View style={designStyles.calendarHeader}>
            <Pressable accessibilityRole="button" onPress={() => moveMonth(-1)} style={designStyles.calendarNav}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={colors.navy} />
            </Pressable>
            <Text style={designStyles.calendarMonth}>{visibleMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text>
            <Pressable accessibilityRole="button" onPress={() => moveMonth(1)} style={designStyles.calendarNav}>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.navy} />
            </Pressable>
          </View>
          <View style={designStyles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={designStyles.weekDay}>{day}</Text>)}
          </View>
          <View style={designStyles.dateGrid}>
            {monthDays.map((day, index) => {
              const isSelected = Boolean(selectedDate && sameDate(selectedDate, day.date));
              return (
                <Pressable
                  key={`${day.date.toISOString()}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(formatIsoDate(day.date));
                    setOpen(false);
                  }}
                  style={[designStyles.dateCell, !day.inMonth && designStyles.dateCellMuted, isSelected && designStyles.dateCellSelected]}
                >
                  <Text style={[designStyles.dateText, !day.inMonth && designStyles.dateTextMuted, isSelected && designStyles.dateTextSelected]}>{day.date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function AppGrid({ children }: PropsWithChildren) {
  return <View style={designStyles.grid}>{children}</View>;
}

function toneBackground(tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral') {
  if (tone === 'success') return '#EAF8F0';
  if (tone === 'warning') return '#FFF4E5';
  if (tone === 'danger') return '#FEEFEF';
  if (tone === 'neutral') return '#F8FAFC';
  return '#E8F1FB';
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthDays(month: Date) {
  const first = monthStart(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReadableDate(value: string) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : value;
}

const designStyles = StyleSheet.create({
  inputWrap: { marginBottom: 12 },
  label: { color: colors.navy, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.navy, fontSize: 16, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  badgeSuccess: { backgroundColor: '#EAF8F0' },
  badgeWarning: { backgroundColor: '#FFF4E5' },
  badgeDanger: { backgroundColor: '#FEEFEF' },
  badgeInfo: { backgroundColor: '#E8F1FB' },
  badgeNeutral: { backgroundColor: '#F8FAFC' },
  badgeSuccessText: { color: '#067647' },
  badgeWarningText: { color: '#B54708' },
  badgeDangerText: { color: colors.danger },
  badgeInfoText: { color: '#0B63CE' },
  badgeNeutralText: { color: colors.grey },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  sectionTitle: { color: colors.navy, fontSize: 16, fontWeight: '900' },
  sectionAction: { minHeight: 34, borderRadius: 13, backgroundColor: '#E8F1FB', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  sectionActionText: { color: '#0B63CE', fontSize: 12, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 10 },
  statCard: { width: '48.4%', minHeight: 86, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 11, shadowColor: colors.navy, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.grey, fontSize: 11, fontWeight: '800', marginTop: 7 },
  timeline: { marginTop: 4 },
  timelineRow: { flexDirection: 'row', minHeight: 54 },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C7D7EA', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  timelineDotComplete: { backgroundColor: colors.green, borderColor: colors.green },
  timelineDotCurrent: { borderColor: '#F79009', backgroundColor: '#FFF4E5' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#D8DEE8' },
  timelineLineComplete: { backgroundColor: colors.green },
  timelineCopy: { flex: 1, paddingBottom: 14 },
  timelineTitle: { color: colors.grey, fontSize: 14, fontWeight: '800' },
  timelineTitleCurrent: { color: colors.navy, fontWeight: '900' },
  timelineMeta: { color: colors.grey, fontSize: 12, marginTop: 3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  searchBar: { minHeight: 50, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.navy, fontSize: 15, fontWeight: '700' },
  selectWrap: { marginBottom: 9 },
  selectButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectCopy: { flex: 1, minWidth: 0 },
  selectTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  selectPlaceholder: { color: '#8A94A6' },
  selectSubtitle: { color: colors.grey, fontSize: 12, fontWeight: '700', marginTop: 3 },
  dropdownPanel: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 10, marginTop: 8, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  dropdownSearch: { minHeight: 44, borderRadius: 15, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dropdownInput: { flex: 1, color: colors.navy, fontSize: 14, fontWeight: '700' },
  dropdownOption: { borderRadius: 14, padding: 11, backgroundColor: colors.white },
  dropdownOptionActive: { backgroundColor: '#E8F1FB' },
  dropdownTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  dropdownTitleActive: { color: '#0B63CE' },
  dropdownSubtitle: { color: colors.grey, fontSize: 12, fontWeight: '700', marginTop: 3 },
  dropdownEmpty: { color: colors.grey, fontSize: 13, fontWeight: '800', padding: 12 },
  calendarPanel: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 12, marginTop: 8, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  calendarHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarNav: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  calendarMonth: { flex: 1, color: colors.navy, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', color: colors.grey, fontSize: 12, fontWeight: '900' },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  dateCellMuted: { opacity: 0.42 },
  dateCellSelected: { backgroundColor: colors.green },
  dateText: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  dateTextMuted: { color: colors.grey },
  dateTextSelected: { color: colors.white },
});
