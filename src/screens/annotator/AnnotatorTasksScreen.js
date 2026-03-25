import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI } from '../../services/api';
import { Screen, Header, Card, StatusBadge, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS, STATUS_CONFIG } from '../../theme';

const FILTER_TABS = ['all', 'assigned', 'in_progress', 'submitted', 'approved', 'rejected'];

export default function AnnotatorTasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksAPI.myTasks();
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadTasks);
    return unsub;
  }, [navigation, loadTasks]);

  useEffect(() => {
    if (activeTab === 'all') setFiltered(tasks);
    else setFiltered(tasks.filter(t => t.status === activeTab));
  }, [tasks, activeTab]);

  const counts = {};
  FILTER_TABS.forEach(tab => {
    counts[tab] = tab === 'all' ? tasks.length : tasks.filter(t => t.status === tab).length;
  });

  const renderTask = ({ item }) => {
    const statusCfg = STATUS_CONFIG[item.status];
    return (
      <Card
        style={styles.taskCard}
        onPress={() => navigation.navigate('AnnotatorTaskDetail', { taskId: item._id })}
        accent={statusCfg?.color}
      >
        <View style={styles.taskHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskProject} numberOfLines={1}>
              {item.projectId?.name || 'Unknown Project'}
            </Text>
            <Text style={styles.taskFile} numberOfLines={1}>
              📄 {item.dataItem?.filename || 'No file'}
            </Text>
          </View>
          <StatusBadge status={item.status} small />
        </View>
        <View style={styles.taskMeta}>
          <View style={styles.taskMetaItem}>
            <Ionicons name="server-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.taskMetaText}>{item.datasetId?.name || '—'}</Text>
          </View>
          <View style={styles.taskMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.taskMetaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        {item.status === 'rejected' && item.reviewComments && (
          <View style={styles.rejectionNote}>
            <Ionicons name="warning-outline" size={14} color={COLORS.danger} />
            <Text style={styles.rejectionText} numberOfLines={2}>{item.reviewComments}</Text>
          </View>
        )}
        <View style={styles.taskFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AnnotatorTaskDetail', { taskId: item._id })}
          >
            <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.actionText, { color: COLORS.primary }]}>View</Text>
          </TouchableOpacity>
          {(item.status === 'assigned' || item.status === 'in_progress' || item.status === 'rejected') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primaryGlow }]}
              onPress={() => navigation.navigate('AnnotatorLabeling', { taskId: item._id })}
            >
              <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.actionText, { color: COLORS.primary }]}>
                {item.status === 'rejected' ? 'Revise' : 'Label'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>My Tasks</Text>
        <Text style={styles.screenSub}>{tasks.length} total assignments</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {FILTER_TABS.filter(t => counts[t] > 0 || t === 'all').map(tab => {
          const cfg = STATUS_CONFIG[tab];
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                active && { backgroundColor: (cfg?.color || COLORS.primary) + '22', borderColor: cfg?.color || COLORS.primary }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, active && { color: cfg?.color || COLORS.primary }]}>
                {tab === 'all' ? 'All' : cfg?.label || tab}
              </Text>
              {counts[tab] > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: (cfg?.color || COLORS.primary) + '33' }]}>
                  <Text style={[styles.tabBadgeText, { color: cfg?.color || COLORS.primary }]}>
                    {counts[tab]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderTask}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="checkbox-outline" title="No tasks" message="You have no tasks in this category" />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  screenSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: RADIUS.full, minWidth: 18, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },
  taskCard: { marginBottom: SPACING.md },
  taskHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  taskProject: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  taskFile: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  taskMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 11, color: COLORS.textMuted },
  rejectionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.dangerGlow, padding: SPACING.sm,
    borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.danger + '33',
  },
  rejectionText: { flex: 1, fontSize: 12, color: COLORS.danger, lineHeight: 18 },
  taskFooter: {
    flexDirection: 'row', gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
});
