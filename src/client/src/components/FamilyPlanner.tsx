import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameDay, isSameMonth, isToday, parseISO,
  startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { spacing, borderRadius, typography } from '../theme';
import { EmptyState } from './EmptyState';
import { GlassCard } from './GlassCard';
import {
  createFamilyEvent,
  deleteFamilyEvent,
  fetchEventsInRange,
  rsvpToEvent,
} from '../services/family.service';
import { showAlert, confirmAlert } from '../utils/alert';
import { Event, EventType } from '../types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'movie', label: 'Movie' },
  { value: 'school', label: 'School' },
  { value: 'doctor', label: 'Doctor' },
];

interface FamilyPlannerProps {
  familyId: string;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function eventsOnDay(events: Event[], day: Date): Event[] {
  return events.filter((event) => isSameDay(parseISO(event.startTime), day));
}

export function FamilyPlanner({ familyId }: FamilyPlannerProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('general');
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const rangeStart = useMemo(
    () => startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 }),
    [visibleMonth]
  );
  const rangeEnd = useMemo(
    () => endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 }),
    [visibleMonth]
  );

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['plannerEvents', familyId, visibleMonth.toISOString()],
    queryFn: () => fetchEventsInRange(familyId, rangeStart, rangeEnd),
    enabled: !!familyId,
  });

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  );

  const selectedDayEvents = useMemo(
    () => eventsOnDay(events, selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDay]
  );

  const upcomingEvents = useMemo(() => {
    const selectedIds = new Set(selectedDayEvents.map((e) => e.id));
    return events
      .filter((e) => parseISO(e.startTime) >= new Date() && !selectedIds.has(e.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [events, selectedDayEvents]);

  const resetForm = () => {
    setTitle('');
    setEventType('general');
    setTime('18:00');
    setLocation('');
    setDescription('');
    setShowForm(false);
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      showAlert('Missing title', 'Enter a title for this event.');
      return;
    }

    setSaving(true);
    try {
      const start = combineDateAndTime(selectedDay, time);
      await createFamilyEvent(familyId, {
        title: title.trim(),
        eventType,
        startTime: start.toISOString(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['plannerEvents', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
      resetForm();
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not create event');
    } finally {
      setSaving(false);
    }
  };

  const handleRsvp = async (eventId: string, status: 'going' | 'maybe' | 'declined') => {
    try {
      await rsvpToEvent(familyId, eventId, status);
      await queryClient.invalidateQueries({ queryKey: ['plannerEvents', familyId] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not update RSVP');
    }
  };

  const handleDelete = (eventId: string, eventTitle: string) => {
    confirmAlert(
      'Delete event',
      `Remove "${eventTitle}" from the family planner?`,
      async () => {
        try {
          await deleteFamilyEvent(familyId, eventId);
          await queryClient.invalidateQueries({ queryKey: ['plannerEvents', familyId] });
          await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
        } catch (error) {
          showAlert('Error', error instanceof Error ? error.message : 'Could not delete event');
        }
      },
      'Delete',
    );
  };

  const renderEventCard = (event: Event) => {
    const myRsvp = event.rsvps?.find((r) => r.userId === userId)?.status;
    const goingCount = event.rsvps?.filter((r) => r.status === 'going').length ?? 0;

    return (
      <GlassCard key={event.id} style={{ ...styles.eventCard, borderColor: theme.border }}>
        <View style={styles.eventHeader}>
          <View style={[styles.typeBadge, { backgroundColor: theme.primary + '14' }]}>
            <Text style={[styles.typeBadgeText, { color: theme.primary }]}>
              {EVENT_TYPES.find((t) => t.value === event.eventType)?.label ?? 'Event'}
            </Text>
          </View>
          <Pressable onPress={() => handleDelete(event.id, event.title)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
        <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
        <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>
          {format(parseISO(event.startTime), 'h:mm a')}
          {event.location ? ` · ${event.location}` : ''}
        </Text>
        {event.description ? (
          <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>{event.description}</Text>
        ) : null}
        {event.createdByName ? (
          <Text style={[styles.eventBy, { color: theme.textTertiary }]}>Added by {event.createdByName}</Text>
        ) : null}

        <View style={styles.rsvpRow}>
          {(['going', 'maybe', 'declined'] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => handleRsvp(event.id, status)}
              style={[
                styles.rsvpBtn,
                {
                  borderColor: myRsvp === status ? theme.primary : theme.border,
                  backgroundColor: myRsvp === status ? theme.primary + '12' : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.rsvpText,
                  { color: myRsvp === status ? theme.primary : theme.textSecondary },
                ]}
              >
                {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : "Can't go"}
              </Text>
            </Pressable>
          ))}
        </View>
        {goingCount > 0 && (
          <Text style={[styles.rsvpCount, { color: theme.textTertiary }]}>
            {goingCount} member{goingCount === 1 ? '' : 's'} going
          </Text>
        )}
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.monthHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable onPress={() => setVisibleMonth((m) => subMonths(m, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: theme.text }]}>{format(visibleMonth, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => setVisibleMonth((m) => addMonths(m, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.weekday, { color: theme.textTertiary }]}>
            {day}
          </Text>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: spacing.lg }} />
      ) : (
        <View style={styles.grid}>
          {calendarDays.map((day) => {
            const dayEvents = eventsOnDay(events, day);
            const inMonth = isSameMonth(day, visibleMonth);
            const selected = isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayCell,
                  selected && { backgroundColor: theme.primary + '18', borderColor: theme.primary },
                  today && !selected && { borderColor: theme.primary + '55' },
                  { borderColor: theme.borderLight },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: inMonth ? theme.text : theme.textTertiary },
                    selected && { color: theme.primary, fontWeight: '700' },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={styles.dotsRow}>
                    {dayEvents.slice(0, 3).map((e) => (
                      <View key={e.id} style={[styles.dot, { backgroundColor: theme.primary }]} />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {format(selectedDay, 'EEEE, MMM d')}
        </Text>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#FFF" />
        </Pressable>
      </View>

      {showForm && (
        <GlassCard style={{ ...styles.form, borderColor: theme.border }}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Event title"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {EVENT_TYPES.map((type) => (
              <Pressable
                key={type.value}
                onPress={() => setEventType(type.value)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: eventType === type.value ? theme.primary : theme.border,
                    backgroundColor: eventType === type.value ? theme.primary + '12' : theme.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: eventType === type.value ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {Platform.OS === 'web' ? (
            <View style={[styles.input, styles.webTimeWrap, { borderColor: theme.border }]}>
              <Text style={[styles.webTimeLabel, { color: theme.textSecondary }]}>Time</Text>
              {/* @ts-ignore — native HTML input, only rendered on web */}
              <input
                type="time"
                value={time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: theme.text,
                  fontFamily: 'inherit',
                  flex: 1,
                }}
              />
            </View>
          ) : (
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Time (HH:MM)"
              placeholderTextColor={theme.textTertiary}
              value={time}
              onChangeText={setTime}
            />
          )}
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Location (optional)"
            placeholderTextColor={theme.textTertiary}
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Pressable
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={handleCreateEvent}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Add to family planner</Text>
            )}
          </Pressable>
        </GlassCard>
      )}

      {selectedDayEvents.length === 0 ? (
        <EmptyState
          iconName="calendar-outline"
          title="No events this day"
          message="Add something the whole family can plan around."
        />
      ) : (
        selectedDayEvents.map(renderEventCard)
      )}

      {upcomingEvents.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing.md }]}>
            Coming up
          </Text>
          {upcomingEvents.map(renderEventCard)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  navBtn: { padding: spacing.sm },
  monthTitle: { ...typography.title, fontSize: 16 },
  weekdayRow: { flexDirection: 'row', marginTop: spacing.xs },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
  },
  dayNumber: { ...typography.caption, fontSize: 13 },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...typography.title, fontSize: 16 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { borderWidth: 1, gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  typeRow: { marginVertical: spacing.xs },
  typeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  typeChipText: { ...typography.caption, fontWeight: '600' },
  saveBtn: { borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
  webTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webTimeLabel: { ...typography.caption, fontWeight: '600', minWidth: 36 },
  eventCard: { borderWidth: 1, marginBottom: spacing.sm },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  typeBadgeText: { ...typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  eventTitle: { ...typography.body, fontWeight: '700', marginTop: spacing.sm },
  eventMeta: { ...typography.caption, marginTop: 4 },
  eventDesc: { ...typography.caption, marginTop: spacing.sm, lineHeight: 18 },
  eventBy: { ...typography.micro, marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 },
  rsvpRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  rsvpBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  rsvpText: { ...typography.micro, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },
  rsvpCount: { ...typography.micro, marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 },
});
