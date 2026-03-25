import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI } from '../../services/api';
import { Screen, Card, StatCard, SectionTitle, StatusBadge, Loading, EmptyState } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ManagerDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await projectsAPI.getAll();
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    draft: projects.filter(p => p.status === 'draft').length,
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.headerGrad}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Manager Dashboard</Text>
            <Text style={styles.username}>{user?.fullName}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
        <View style={[styles.roleChip, { backgroundColor: COLORS.roleManager + '22', borderColor: COLORS.roleManager + '55' }]}>
          <Ionicons name="briefcase-outline" size={14} color={COLORS.roleManager} />
          <Text style={[styles.roleChipText, { color: COLORS.roleManager }]}>Project Manager</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <SectionTitle title="Project Overview" />
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={stats.total} icon="folder-outline" color={COLORS.primary} />
          <StatCard label="Active" value={stats.active} icon="play-circle-outline" color={COLORS.accent} />
          <StatCard label="Completed" value={stats.completed} icon="checkmark-done-outline" color={COLORS.info} />
          <StatCard label="Draft" value={stats.draft} icon="document-outline" color={COLORS.textMuted} />
        </View>

        {/* Quick Actions */}
        <SectionTitle title="Quick Actions" style={{ marginTop: SPACING.lg }} />
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Projects', { screen: 'ManagerCreateProject' })}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.quickActionIcon}>
              <Ionicons name="add" size={24} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.quickActionText}>New Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Datasets', { screen: 'ManagerUploadDataset' })}
          >
            <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={styles.quickActionIcon}>
              <Ionicons name="cloud-upload-outline" size={24} color={COLORS.bg} />
            </LinearGradient>
            <Text style={styles.quickActionText}>Upload Dataset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Projects', { screen: 'ManagerProjects' })}
          >
            <LinearGradient colors={[COLORS.warning, '#E5A020']} style={styles.quickActionIcon}>
              <Ionicons name="people-outline" size={24} color={COLORS.bg} />
            </LinearGradient>
            <Text style={styles.quickActionText}>Assign Tasks</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Projects */}
        <SectionTitle
          title="Recent Projects"
          action={() => navigation.navigate('Projects')}
          actionLabel="View All"
          style={{ marginTop: SPACING.lg }}
        />
        {projects.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No projects yet"
            message="Create your first project to get started"
            action={() => navigation.navigate('Projects', { screen: 'ManagerCreateProject' })}
            actionLabel="Create Project"
          />
        ) : (
          projects.slice(0, 3).map(project => (
            <Card
              key={project._id}
              style={styles.projectCard}
              onPress={() => navigation.navigate('Projects', {
                screen: 'ManagerProjectDetail',
                params: { projectId: project._id }
              })}
              accent={project.status === 'active' ? COLORS.accent : project.status === 'completed' ? COLORS.primary : COLORS.border}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                <StatusBadge status={project.status} small />
              </View>
              {project.description ? (
                <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
              ) : null}
              <View style={styles.projectMeta}>
                <View style={styles.projectMetaItem}>
                  <Ionicons name="pricetags-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.projectMetaText}>{project.labelSet?.length || 0} labels</Text>
                </View>
                <View style={styles.projectMetaItem}>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.projectMetaText}>{new Date(project.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerGrad: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  greeting: { fontSize: 13, color: COLORS.textSecondary },
  username: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.sm },
  roleChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, alignSelf: 'flex-start', gap: 6,
  },
  roleChipText: { fontSize: 12, fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  projectCard: { marginBottom: SPACING.md },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  projectName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginRight: SPACING.sm },
  projectDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm, lineHeight: 18 },
  projectMeta: { flexDirection: 'row', gap: SPACING.lg },
  projectMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectMetaText: { fontSize: 12, color: COLORS.textMuted },
});
