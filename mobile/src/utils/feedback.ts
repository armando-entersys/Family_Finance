import { Platform, Alert } from 'react-native';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface ShowFeedbackOptions {
  title?: string;
  message: string;
  type?: FeedbackType;
  onOk?: () => void;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

/**
 * Shows feedback to the user in a cross-platform way
 * Works on both web and native
 */
export const showFeedback = ({
  title,
  message,
  type = 'info',
  onOk,
  buttons,
}: ShowFeedbackOptions) => {
  const defaultTitle = {
    success: 'Exito',
    error: 'Error',
    warning: 'Aviso',
    info: 'Informacion',
  }[type];

  const finalTitle = title || defaultTitle;

  if (Platform.OS === 'web') {
    // Web: use window.confirm for actions, window.alert for simple messages
    if (buttons && buttons.length > 1) {
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const cancelButton = buttons.find(b => b.style === 'cancel');

      if (window.confirm(`${finalTitle}\n\n${message}`)) {
        confirmButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    } else {
      window.alert(`${finalTitle}\n\n${message}`);
      if (onOk) {
        onOk();
      } else if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Native: use Alert.alert
    const alertButtons = buttons || [{ text: 'OK', onPress: onOk }];
    Alert.alert(finalTitle, message, alertButtons);
  }
};

/**
 * Quick success feedback with optional navigation
 */
export const showSuccess = (message: string, onOk?: () => void) => {
  showFeedback({ message, type: 'success', onOk });
};

/**
 * Quick error feedback
 */
export const showError = (message: string, onOk?: () => void) => {
  showFeedback({ message, type: 'error', onOk });
};

/**
 * Confirmation dialog
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showFeedback({
    title,
    message,
    type: 'warning',
    buttons: [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
    ],
  });
};
