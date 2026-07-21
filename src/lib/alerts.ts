import { Alert, Platform } from 'react-native';

/**
 * Alert.alert() de React Native n'est pas implémenté par react-native-web :
 * sur le web, l'appel ne fait rien du tout, silencieusement (pas d'erreur,
 * pas de popup). Ces helpers basculent sur window.alert / window.confirm
 * sur le web, et utilisent l'Alert natif sur iOS/Android.
 */

export function showAlert(title: string, message?: string, onDismiss?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onDismiss?.();
  } else {
    Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
  }
}

export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string = 'Confirmer',
  destructive: boolean = false
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  }
}
