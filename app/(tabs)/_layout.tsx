import { Ionicons, Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="persona">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>Persona</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="memories">
        <NativeTabs.Trigger.Icon sf={{ default: 'brain.head.profile', selected: 'brain.head.profile' }} />
        <NativeTabs.Trigger.Label>Memories</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="link">
        <NativeTabs.Trigger.Icon sf={{ default: 'antenna.radiowaves.left.and.right', selected: 'antenna.radiowaves.left.and.right' }} />
        <NativeTabs.Trigger.Label>Link</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="backup">
        <NativeTabs.Trigger.Icon sf={{ default: 'externaldrive', selected: 'externaldrive.fill' }} />
        <NativeTabs.Trigger.Label>Backup</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.surfaceDeep,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 84 : undefined,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="persona"
        options={{
          title: 'Persona',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color, size }) => <Feather name="archive" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="link"
        options={{
          title: 'Link',
          tabBarIcon: ({ color, size }) => <Ionicons name="link-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="backup"
        options={{
          title: 'Backup',
          tabBarIcon: ({ color, size }) => <Feather name="save" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
