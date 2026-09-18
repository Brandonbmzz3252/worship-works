import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';

import { HeaderAdd, HeaderMenu } from '@/components/ui/header-menu';
import { WebHeader } from '@/components/ui/web-header';
import { LoadingView } from '@/components/ui/loading-view';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
}

export default function TabsLayout() {
  const router = useRouter();
  const brand = useBrand();
  const { user, status, isAdmin } = useAuth();

  if (status === 'loading') {
    return <LoadingView />;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: brand.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        headerTitleAlign: 'center',
        headerLeft: () => <HeaderMenu />,
        headerBackground: () => (
          <LinearGradient
            colors={[brand.gradientStart, brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.muted,
        ...(Platform.OS === 'web'
          ? {
              header: () => <WebHeader />,
              tabBarStyle: { display: 'none' },
            }
          : {
              tabBarStyle: {
                backgroundColor: brand.background,
                borderTopColor: brand.background,
              },
            }),
        sceneStyle: { backgroundColor: brand.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Setlist',
          tabBarIcon: tabIcon('musical-notes'),
          headerRight: () => <HeaderAdd onPress={() => router.navigate('/setlist-new')} />,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: 'Songs',
          tabBarIcon: tabIcon('library'),
          headerRight: () =>
            isAdmin ? (
              <HeaderAdd onPress={() => router.navigate('/admin/song-upload')} />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: tabIcon('chatbubbles'),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: tabIcon('calendar'),
          headerRight: () =>
            isAdmin ? (
              <HeaderAdd onPress={() => router.navigate('/admin/event-new')} />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          tabBarIcon: tabIcon('people'),
          headerRight: () =>
            isAdmin ? (
              <HeaderAdd onPress={() => router.navigate('/admin/roster-new')} />
            ) : null,
        }}
      />
    </Tabs>
  );
}