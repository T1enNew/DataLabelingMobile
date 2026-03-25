import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import ManagerDashboardScreen from '../screens/manager/ManagerDashboardScreen';
import ManagerProjectsScreen from '../screens/manager/ManagerProjectsScreen';
import ManagerCreateProjectScreen from '../screens/manager/ManagerCreateProjectScreen';
import ManagerProjectDetailScreen from '../screens/manager/ManagerProjectDetailScreen';
import ManagerDatasetsScreen from '../screens/manager/ManagerDatasetsScreen';
import ManagerDatasetDetailScreen from '../screens/manager/ManagerDatasetDetailScreen';
import ManagerUploadDatasetScreen from '../screens/manager/ManagerUploadDatasetScreen';
import ManagerAssignTaskScreen from '../screens/manager/ManagerAssignTaskScreen';
import ManagerProfileScreen from '../screens/manager/ManagerProfileScreen';
import ManagerApprovedDatasetScreen from '../screens/manager/ManagerApprovedDatasetScreen';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const ProjectsStack = createNativeStackNavigator();
const DatasetsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function DashboardStackNav() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="ManagerDashboard" component={ManagerDashboardScreen} />
    </DashboardStack.Navigator>
  );
}

function ProjectsStackNav() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ManagerProjects" component={ManagerProjectsScreen} />
      <ProjectsStack.Screen name="ManagerCreateProject" component={ManagerCreateProjectScreen} />
      <ProjectsStack.Screen name="ManagerProjectDetail" component={ManagerProjectDetailScreen} />
      <ProjectsStack.Screen name="ManagerAssignTask" component={ManagerAssignTaskScreen} />
      <ProjectsStack.Screen name="ManagerApprovedDataset" component={ManagerApprovedDatasetScreen} />
    </ProjectsStack.Navigator>
  );
}

function DatasetsStackNav() {
  return (
    <DatasetsStack.Navigator screenOptions={{ headerShown: false }}>
      <DatasetsStack.Screen name="ManagerDatasets" component={ManagerDatasetsScreen} />
      <DatasetsStack.Screen name="ManagerDatasetDetail" component={ManagerDatasetDetailScreen} />
      <DatasetsStack.Screen name="ManagerUploadDataset" component={ManagerUploadDatasetScreen} />
    </DatasetsStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ManagerProfile" component={ManagerProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export default function ManagerNavigator() {
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
        tabBarActiveTintColor: COLORS.roleManager,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'speedometer' : 'speedometer-outline',
            Projects: focused ? 'folder' : 'folder-outline',
            Datasets: focused ? 'server' : 'server-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNav} />
      <Tab.Screen name="Projects" component={ProjectsStackNav} />
      <Tab.Screen name="Datasets" component={DatasetsStackNav} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}
