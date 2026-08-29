import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Stretch inner content to full max width (default true) */
  fill?: boolean;
}

export function ResponsiveContainer({ children, style, fill = true }: ResponsiveContainerProps) {
  const { contentMaxWidth, horizontalPadding, isWide } = useResponsive();

  return (
    <View style={[styles.outer, isWide && styles.outerWide]}>
      <View
        style={[
          styles.inner,
          fill && styles.fill,
          {
            maxWidth: contentMaxWidth,
            paddingHorizontal: horizontalPadding,
            alignSelf: 'stretch',
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  outerWide: {
    alignSelf: 'center',
  },
  inner: {
    width: '100%',
  },
  fill: {
    flexGrow: 1,
  },
});
