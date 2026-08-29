import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { useThemeStore } from '../store';
import { colors, spacing, borderRadius, typography } from '../theme';
import { GlassCard } from './GlassCard';

interface CountdownWidgetProps {
  targetDate: string;
  label?: string;
}

export function CountdownWidget({ targetDate, label }: CountdownWidgetProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const update = () => {
      const target = new Date(targetDate);
      const now = new Date();
      setTimeLeft({
        days: Math.max(0, differenceInDays(target, now)),
        hours: Math.max(0, differenceInHours(target, now) % 24),
        minutes: Math.max(0, differenceInMinutes(target, now) % 60),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <GlassCard style={styles.card}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View style={styles.row}>
        {[
          { value: timeLeft.days, unit: 'Days' },
          { value: timeLeft.hours, unit: 'Hrs' },
          { value: timeLeft.minutes, unit: 'Min' },
        ].map((item) => (
          <View key={item.unit} style={styles.unit}>
            <Text style={[styles.value, { color: theme.primary }]}>{item.value}</Text>
            <Text style={[styles.unitLabel, { color: theme.textTertiary }]}>{item.unit}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  unit: {
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  unitLabel: {
    ...typography.micro,
    marginTop: 2,
  },
});
