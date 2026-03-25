import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import AnnotatorTasksScreen from '../screens/annotator/AnnotatorTasksScreen';
import AnnotatorTaskDetailScreen from '../screens/annotator/AnnotatorTaskDetailScreen';
import AnnotatorLabelingScreen from '../screens/annotator/AnnotatorLabelingScreen';
import AnnotatorProfileScreen from '../screens/annotator/AnnotatorProfileScreen';

const Tab = createBottomTabNavigator();
const TasksStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function TasksStackNav() {
  return (
    <TasksStack.Navigator screenOptions={{ headerShown: false }}>
      <TasksStack.Screen name="AnnotatorTasks" component={AnnotatorTasksScreen} />
      <TasksStack.Screen name="AnnotatorTaskDetail" component={AnnotatorTaskDetailScreen} />
      <TasksStack.Screen name="AnnotatorLabeling" component={AnnotatorLabelingScreen} />
    </TasksStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="AnnotatorProfile" component={AnnotatorProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export default function AnnotatorNavigator() {
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
        tabBarActiveTintColor: COLORS.roleAnnotator,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Tasks: focused ? 'checkbox' : 'checkbox-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksStackNav} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}
