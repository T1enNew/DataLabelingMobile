import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';

import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminCreateUserScreen from '../screens/admin/AdminCreateUserScreen';
import AdminEditUserScreen from '../screens/admin/AdminEditUserScreen';
import AdminActivityLogsScreen from '../screens/admin/AdminActivityLogsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Tab = createBottomTabNavigator();
const UsersStack = createNativeStackNavigator();
const LogsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();

function UsersStackNav() {
  return (
    <UsersStack.Navigator screenOptions={{ headerShown: false }}>
      <UsersStack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <UsersStack.Screen name="AdminCreateUser" component={AdminCreateUserScreen} />
      <UsersStack.Screen name="AdminEditUser" component={AdminEditUserScreen} />
    </UsersStack.Navigator>
  );
}

function LogsStackNav() {
  return (
    <LogsStack.Navigator screenOptions={{ headerShown: false }}>
      <LogsStack.Screen name="AdminLogs" component={AdminActivityLogsScreen} />
    </LogsStack.Navigator>
  );
}

function SettingsStackNav() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    </SettingsStack.Navigator>
  );
}

function DashboardStackNav() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </DashboardStack.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.roleAdmin,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Users: focused ? 'people' : 'people-outline',
            Logs: focused ? 'list' : 'list-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNav} />
      <Tab.Screen name="Users" component={UsersStackNav} />
      <Tab.Screen name="Logs" component={LogsStackNav} />
      <Tab.Screen name="Settings" component={SettingsStackNav} />
    </Tab.Navigator>
  );
}
