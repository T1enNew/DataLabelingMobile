import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activityLogsAPI } from '../../services/api';
import { Screen, Header, Card, Loading, EmptyState } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const ACTION_COLORS = {
  login: COLORS.accent,
  logout: COLORS.textMuted,
  project_create: COLORS.primary,
  project_update: COLORS.info,
  project_delete: COLORS.danger,
  task_assign: COLORS.primary,
  task_submit: COLORS.warning,
  task_approve: COLORS.accent,
  task_reject: COLORS.danger,
  dataset_upload: COLORS.primary,
  dataset_delete: COLORS.danger,
  user_create: COLORS.accent,
  user_update: COLORS.info,
  user_delete: COLORS.danger,
  user_activate: COLORS.accent,
  user_deactivate: COLORS.warning,
  export_data: COLORS.info,
};

const formatAction = (action) =>
  action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || action;

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString();
};

export default function AdminActivityLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async (p = 1, reset = true) => {
    try {
      const res = await activityLogsAPI.getAll({ page: p, limit: 20, action: actionFilter || undefined });
      if (reset) {
        setLogs(res.data.logs || []);
      } else {
        setLogs(prev => [...prev, ...(res.data.logs || [])]);
      }
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [actionFilter]);

  useEffect(() => { loadLogs(1); }, [loadLogs]);

  const onRefresh = () => { setRefreshing(true); loadLogs(1); };

  const loadMore = () => {
    if (!loadingMore && page < totalPages) {
      setLoadingMore(true);
      loadLogs(page + 1, false);
    }
  };

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Login', value: 'login' },
    { label: 'Create', value: 'user_create' },
    { label: 'Task', value: 'task_submit' },
    { label: 'Export', value: 'export_data' },
  ];

  const renderLog = ({ item }) => {
    const color = ACTION_COLORS[item.action] || COLORS.primary;
    return (
      <Card style={styles.logCard}>
        <View style={styles.logRow}>
          <View style={[styles.actionDot, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.logHeader}>
              <View style={[styles.actionTag, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                <Text style={[styles.actionTagText, { color }]}>{formatAction(item.action)}</Text>
              </View>
              <Text style={styles.logTime}>{formatTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.logDesc} numberOfLines={2}>{item.description}</Text>
            {item.userId && (
              <View style={styles.userRow}>
                <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.logUser}>
                  {item.userId?.fullName || item.userId?.username || 'Unknown'}
                </Text>
                {item.userId?.role && (
                  <Text style={styles.logUserRole}> · {item.userId.role}</Text>
                )}
              </View>
            )}
            {item.ipAddress && (
              <View style={styles.userRow}>
                <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.logUser}>{item.ipAddress}</Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (loading) return <Screen><Header title="Activity Logs" /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Activity Logs" subtitle={`Page ${page} of ${totalPages}`} />

      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, actionFilter === f.value && styles.filterBtnActive]}
            onPress={() => setActionFilter(f.value)}
          >
            <Text style={[styles.filterText, actionFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={logs}
        renderItem={renderLog}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState icon="list-outline" title="No logs found" message="Activity will appear here" />
        }
        ListFooterComponent={loadingMore ? <Loading /> : null}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  logCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  logRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionDot: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  actionTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  logDesc: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  logUser: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  logUserRole: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
