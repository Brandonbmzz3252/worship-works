import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { BrandProvider, useBrand } from '@/lib/theme-context';
import { configureNotificationHandler, isExpoGo, NotificationTap } from '@/lib/notifications';
import { setQueryErrorHandler } from '@/lib/store';
import { LoadingView } from '@/components/ui/loading-view';

configureNotificationHandler();

function QueryErrorBanner() {
  const [error, setError] = useState<{ label: string; message: string } | null>(null);

  useEffect(() => {
    setQueryErrorHandler((label, err) => {
      setError({
        label,
        message: err instanceof Error ? err.message.split('\n')[0] : String(err),
      });
    });
    return () => setQueryErrorHandler(null);
  }, []);

  if (!error) return null;

  return (
    <View style={styles.bannerWrap} pointerEvents="box-none">
      <View style={styles.banner}>
        <Ionicons name="warning" size={18} color="#7A4E00" />
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>Could not load {error.label}</Text>
          <Text style={styles.bannerMsg} numberOfLines={4}>
            {error.message}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => setError(null)}>
          <Ionicons name="close" size={18} color="#7A4E00" />
        </Pressable>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const brand = useBrand();

  if (status === 'loading') {
    return <LoadingView />;
  }

  return (
    <>
      {(Platform.OS !== 'web' && !isExpoGo()) && <NotificationTap />}
      <QueryErrorBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: brand.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="groups" />
        <Stack.Screen name="birthdays" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="setlist/[id]" />
        <Stack.Screen
          name="setlist-new"
          options={{
            headerShown: true,
            title: 'New Setlist',
            headerStyle: { backgroundColor: brand.primary },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen
          name="setlist-edit"
          options={{
            headerShown: true,
            title: 'Edit Setlist',
            headerStyle: { backgroundColor: brand.primary },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen name="song/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return (
      <BrandProvider>
        <LoadingView />
      </BrandProvider>
    );
  }

  return (
    <BrandProvider>
      <AuthProvider>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </BrandProvider>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 12,
    paddingTop: 46,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF4DC',
    borderColor: '#E3C26B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  bannerBody: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7A4E00',
  },
  bannerMsg: {
    fontSize: 11.5,
    lineHeight: 15,
    color: '#7A4E00',
  },
});