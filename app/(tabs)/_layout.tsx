import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/theme/tokens';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9AA7BD',
        tabBarStyle: {
          height: 76,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('parent.tabHome'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('parent.tabHistory'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('parent.tabAnalytics'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: t('parent.tabExams'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('parent.tabMore'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
