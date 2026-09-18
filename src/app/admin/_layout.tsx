import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui/loading-view';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';

export default function AdminLayout() {
  const { status, profile } = useAuth();
  const brand = useBrand();

  if (status === 'signedOut') {
    return <Redirect href="/sign-in" />;
  }
  if (!profile) {
    return <LoadingView />;
  }
  if (profile.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: brand.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: brand.background },
      }}>
      <Stack.Screen name="song-upload" options={{ title: 'Upload Song' }} />
      <Stack.Screen name="event-new" options={{ title: 'New Event' }} />
      <Stack.Screen name="event-edit" options={{ title: 'Edit Event' }} />
      <Stack.Screen name="roster-new" options={{ title: 'New Duty' }} />
      <Stack.Screen name="roster-edit" options={{ title: 'Edit Duty' }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="access" options={{ title: 'People' }} />
      <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="church-setup" options={{ title: 'Church Setup' }} />
    </Stack>
  );
}