/**
 * Cross-platform alert helpers.
 *
 * React Native's `Alert.alert` is silently ignored in Expo Web builds, so
 * these helpers fall back to native browser dialogs when running in a browser.
 *
 * Import these everywhere instead of calling `Alert` directly.
 */

import { Alert, Platform } from 'react-native';

/**
 * Show a simple message dialog.
 *
 * @param title   Bold heading text.
 * @param message Body text shown below the heading.
 */
export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

/**
 * Show a destructive-action confirmation dialog.
 * `onConfirm` is only called if the user accepts.
 *
 * @param title        Bold heading text.
 * @param message      Body text explaining the action.
 * @param onConfirm    Callback invoked on acceptance.
 * @param confirmLabel Label for the confirm button (default: "Delete").
 */
export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete',
): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}
