/**
 * ReviewerNavigator - Updated with full reviewer workflow
 * Workflow: Queue -> ProjectDetail -> Subtopic -> Tasks -> ReviewTask
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import ReviewerQueueScreen from '../screens/reviewer/ReviewerQueueScreen';
import ReviewerProjectDetailScreen from '../screens/reviewer/ReviewerProjectDetailScreen';
import ReviewerSubtopicScreen from '../screens/reviewer/ReviewerSubtopicScreen';
import ReviewerTasksScreen from '../screens/reviewer/ReviewerTasksScreen';
import ReviewerHistoryScreen from '../screens/reviewer/ReviewerHistoryScreen';
import ReviewerProfileScreen from '../screens/reviewer/ReviewerProfileScreen';

const Tab = createBottomTabNavigator();
const QueueStack = createNativeStackNavigator();
const HistoryStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

/**
 * Queue stack: Queue -> ProjectDetail -> Subtopic -> Tasks -> ReviewTask
 */
function QueueStackNav() {
  return (
    <QueueStack.Navigator screenOptions={{ headerShown: false }}>
      <QueueStack.Screen name="ReviewerQueue" component={ReviewerQueueScreen} />
      <QueueStack.Screen name="ReviewerProjectDetail" component={ReviewerProjectDetailScreen} />
      <QueueStack.Screen name="ReviewerSubtopic" component={ReviewerSubtopicScreen} />
      <QueueStack.Screen name="ReviewerTasks" component={ReviewerTasksScreen} />
    </QueueStack.Navigator>
  );
}

/**
 * History stack: History -> ReviewTask (read-only)
 */
function HistoryStackNav() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="ReviewerHistory" component={ReviewerHistoryScreen} />
      <HistoryStack.Screen name="ReviewerTask" component={ReviewerTasksScreen} />
    </HistoryStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ReviewerProfile" component={ReviewerProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export default function ReviewerNavigator() {
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
        tabBarActiveTintColor: COLORS.roleReviewer,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Queue: focused ? 'layers' : 'layers-outline',
            History: focused ? 'time' : 'time-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Queue" component={QueueStackNav} />
      <Tab.Screen name="History" component={HistoryStackNav} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}
