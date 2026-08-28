import React from 'react';
import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NotoSansTamil_400Regular, NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';

import i18n from '@/i18n';
import { ToastProvider } from '@/components/Toast';
import { AppProviders } from '@/context/AppProviders';
import { configureForegroundHandler } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();
configureForegroundHandler();

export default function RootLayout() {
  // Noto Naskh Arabic + Noto Sans Tamil carry the trilingual UI and the mushaf
  // margin pills; without them Arabic/Tamil fall back to a system face.
  const [fontsLoaded] = useFonts({
    NotoSansTamil_400Regular,
    NotoSansTamil_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
  });

  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <AppProviders>
              <ToastProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)/login" />
                  <Stack.Screen name="mushaf" options={{ presentation: 'fullScreenModal' }} />
                  <Stack.Screen name="student/[id]" />
                </Stack>
              </ToastProvider>
            </AppProviders>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
