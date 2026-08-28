import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';

const triggerHaptics = async (type: 'success' | 'error') => {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.notificationAsync(
      type === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  } catch {}
};

interface ToastData {
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProviderState {
  toast: ToastData | null;
  showToast: (toast: ToastData) => void;
}

export const ToastContext = React.createContext<ToastProviderState>({
  toast: null,
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (data: ToastData) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast(data);
    if (data.type === 'success' || data.type === 'error') {
      triggerHaptics(data.type);
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    hideTimer.current = setTimeout(() => hideToast(), 1800);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const colors = { success: '#0FA968', error: '#E23B3B', info: '#1E5FE0' };

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            { transform: [{ translateY }], opacity, backgroundColor: colors[toast.type || 'info'] },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  return React.useContext(ToastContext);
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 48,
    left: 24,
    right: 24,
    zIndex: 9999,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});