import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, activityLogsAPI } from '../../services/api';
import { Screen, Header, Card, StatCard, Loading, SectionTitle, RoleBadge } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, logsRes] = await Promise.all([
        usersAPI.getAll(),
        activityLogsAPI.getAll({ limit: 5 }),
      ]);
      const users = usersRes.data;
      setStats({
        total: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        annotator: users.filter(u => u.role === 'annotator').length,
        reviewer: users.filter(u => u.role === 'reviewer').length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
      });
      setRecentLogs(logsRes.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) return <Screen><Loading message="Loading dashboard..." /></Screen>;

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.headerGrad}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.fullName || user?.username}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
        <View style={[styles.roleChip, { backgroundColor: COLORS.roleAdmin + '22', borderColor: COLORS.roleAdmin + '55' }]}>
          <Ionicons name="shield-outline" size={14} color={COLORS.roleAdmin} />
          <Text style={[styles.roleChipText, { color: COLORS.roleAdmin }]}>Administrator</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* User Stats */}
        <SectionTitle title="User Overview" />
        <View style={styles.statsRow}>
          <StatCard label="Total Users" value={stats?.total} icon="people-outline" color={COLORS.primary} />
          <StatCard label="Active" value={stats?.active} icon="checkmark-circle-outline" color={COLORS.accent} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Managers" value={stats?.manager} icon="briefcase-outline" color={COLORS.roleManager} />
          <StatCard label="Annotators" value={stats?.annotator} icon="color-wand-outline" color={COLORS.roleAnnotator} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Reviewers" value={stats?.reviewer} icon="eye-outline" color={COLORS.roleReviewer} />
          <StatCard label="Inactive" value={stats?.inactive} icon="close-circle-outline" color={COLORS.danger} />
        </View>

        {/* Recent Activity */}
        <SectionTitle title="Recent Activity" style={{ marginTop: SPACING.lg }} />
        {recentLogs.length === 0 ? (
          <Card>
            <Text style={styles.noLogs}>No recent activity</Text>
          </Card>
        ) : (
          recentLogs.map((log) => (
            <Card key={log._id} style={styles.logCard}>
              <View style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: getActionColor(log.action) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logAction}>{formatAction(log.action)}</Text>
                  <Text style={styles.logDesc} numberOfLines={2}>{log.description}</Text>
                  <Text style={styles.logTime}>{formatTime(log.createdAt)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const getActionColor = (action) => {
  if (action?.includes('delete') || action?.includes('deactivate')) return COLORS.danger;
  if (action?.includes('create') || action?.includes('approve')) return COLORS.accent;
  if (action?.includes('reject')) return COLORS.warning;
  return COLORS.primary;
};

const formatAction = (action) => {
  return action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || action;
};

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

const styles = StyleSheet.create({
  headerGrad: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: COLORS.dangerGlow,
    borderRadius: RADIUS.sm,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  logCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  logAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  noLogs: {
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: SPACING.lg,
  },
});
