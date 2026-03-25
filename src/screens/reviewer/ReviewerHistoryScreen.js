import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAPI } from '../../services/api';
import { Screen, Card, StatusBadge, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ReviewerHistoryScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadTasks = useCallback(async () => {
    try {
      const res = await reviewsAPI.getReviewed();
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

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const renderTask = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ReviewerTask', { taskId: item._id, mode: 'history' })}
      accent={item.status === 'approved' ? COLORS.accent : COLORS.danger}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.projectName} numberOfLines={1}>{item.projectId?.name || '-'}</Text>
          <Text style={styles.fileName} numberOfLines={1}>File: {item.dataItem?.filename || '-'}</Text>
        </View>
        <StatusBadge status={item.status} small />
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.annotatorId?.fullName || '-'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>
            {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>
      {item.status === 'rejected' && item.reviewComments && (
        <View style={styles.rejectNote}>
          <Ionicons name="warning-outline" size={13} color={COLORS.danger} />
          <Text style={styles.rejectNoteText} numberOfLines={2}>{item.reviewComments}</Text>
        </View>
      )}
      {item.errorCategory && (
        <View style={styles.errorTag}>
          <Text style={styles.errorTagText}>{item.errorCategory.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
      )}
    </Card>
  );

  if (loading) return <Screen><Loading /></Screen>;

  const approved = tasks.filter(t => t.status === 'approved').length;
  const rejected = tasks.filter(t => t.status === 'rejected').length;

  return (
    <Screen>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Review History</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: COLORS.accent }]} />
            <Text style={[styles.statChipText, { color: COLORS.accent }]}>{approved} approved</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
            <Text style={[styles.statChipText, { color: COLORS.danger }]}>{rejected} rejected</Text>
          </View>
        </View>
      </View>
      <View style={styles.filterBar}>
        {['all', 'approved', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && { color: COLORS.primary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        renderItem={renderTask}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTasks(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="No history yet" message="Reviewed tasks will appear here" />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statChipText: { fontSize: 13, fontWeight: '600' },
  filterBar: {
    flexDirection: 'row', padding: SPACING.md, gap: SPACING.xs,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
  },
  filterBtnActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  card: { marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  projectName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  fileName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  rejectNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.dangerGlow, padding: SPACING.sm, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.danger + '33', marginBottom: SPACING.xs,
  },
  rejectNoteText: { flex: 1, fontSize: 12, color: COLORS.danger, lineHeight: 17 },
  errorTag: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: COLORS.danger + '22', borderRadius: RADIUS.full,
  },
  errorTagText: { fontSize: 10, fontWeight: '700', color: COLORS.danger },
});
