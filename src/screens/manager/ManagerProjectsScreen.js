import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI } from '../../services/api';
import { Screen, Header, Card, StatusBadge, EmptyState, Loading, Button } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ManagerProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectsAPI.getAll();
      setProjects(res.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProjects);
    return unsubscribe;
  }, [navigation, loadProjects]);

  const handleDelete = (project) => {
    Alert.alert('Delete Project', `Delete "${project.name}"? All tasks will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await projectsAPI.delete(project._id);
            loadProjects();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const renderProject = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ManagerProjectDetail', { projectId: item._id })}
      accent={
        item.status === 'active' ? COLORS.accent :
        item.status === 'completed' ? COLORS.primary :
        item.status === 'draft' ? COLORS.textMuted : COLORS.border
      }
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.projectDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} small />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="pricetags-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.labelSet?.length || 0} labels</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="help-circle-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.questions?.length || 0} questions</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ManagerProjectDetail', { projectId: item._id })}
        >
          <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
          <Text style={[styles.actionText, { color: COLORS.primary }]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ManagerAssignTask', { project: item })}
        >
          <Ionicons name="people-outline" size={15} color={COLORS.accent} />
          <Text style={[styles.actionText, { color: COLORS.accent }]}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <Screen><Header title="Projects" /><Loading /></Screen>;

  return (
    <Screen>
      <Header
        title="Projects"
        subtitle={`${projects.length} total`}
        rightAction={() => navigation.navigate('ManagerCreateProject')}
        rightIcon="add"
      />
      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProjects(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No projects yet"
            message="Create your first project to get started"
            action={() => navigation.navigate('ManagerCreateProject')}
            actionLabel="New Project"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  projectName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  projectDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
});
