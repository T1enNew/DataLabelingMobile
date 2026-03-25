import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import AdminNavigator from './AdminNavigator';
import ManagerNavigator from './ManagerNavigator';
import AnnotatorNavigator from './AnnotatorNavigator';
import ReviewerNavigator from './ReviewerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  switch (user.role) {
    case 'admin':
      return <AdminNavigator />;
    case 'manager':
      return <ManagerNavigator />;
    case 'annotator':
      return <AnnotatorNavigator />;
    case 'reviewer':
      return <ReviewerNavigator />;
    default:
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      );
  }
}
