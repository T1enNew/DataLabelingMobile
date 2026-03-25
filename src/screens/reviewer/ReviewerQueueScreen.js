import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAPI } from '../../services/api';
import { Screen, Card, Loading, EmptyState, Tag } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ReviewerQueueScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await reviewsAPI.getPending();
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

  const renderTask = ({ item }) => (
    <Card
      style={styles.taskCard}
      onPress={() => navigation.navigate('ReviewerTask', { taskId: item._id, mode: 'review' })}
      accent={COLORS.warning}
    >
      <View style={styles.taskHeader}>
        <View style={styles.pendingTag}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingText}>Awaiting Review</Text>
        </View>
        <Text style={styles.taskDate}>
          {new Date(item.submittedAt || item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.projectName} numberOfLines={1}>
        {item.projectId?.name || 'Unknown Project'}
      </Text>
      <Text style={styles.fileName} numberOfLines={1}>📄 {item.dataItem?.filename}</Text>

      <View style={styles.annotatorRow}>
        <View style={styles.annotatorAvatar}>
          <Text style={styles.annotatorAvatarText}>
            {(item.annotatorId?.fullName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.annotatorName}>{item.annotatorId?.fullName || 'Unknown'}</Text>
          <Text style={styles.annotatorLabel}>Annotator</Text>
        </View>
      </View>

      {item.labels?.objects?.length > 0 && (
        <View style={styles.labelsPreview}>
          {[...new Set(item.labels.objects.map(o => o.label))].slice(0, 4).map(label => {
            const labelDef = item.projectId?.labelSet?.find(l => l.name === label);
            return <Tag key={label} label={label} color={labelDef?.color} />;
          })}
          {item.labels.objects.length > 4 && (
            <Text style={styles.moreLabels}>+{item.labels.objects.length - 4} more</Text>
          )}
        </View>
      )}

      <View style={styles.reviewBtn}>
        <Ionicons name="eye-outline" size={16} color={COLORS.warning} />
        <Text style={styles.reviewBtnText}>Review Now</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.warning} />
      </View>
    </Card>
  );

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Review Queue</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{tasks.length}</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="Queue is empty"
            message="All tasks have been reviewed. Great work!"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  countBadge: {
    backgroundColor: COLORS.warning + '33', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.warning + '55',
  },
  countText: { fontSize: 14, fontWeight: '800', color: COLORS.warning },
  taskCard: { marginBottom: SPACING.md },
  taskHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  pendingTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.warning + '22', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.warning + '44',
  },
  pendingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  taskDate: { fontSize: 11, color: COLORS.textMuted },
  projectName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  fileName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  annotatorRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  annotatorAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.roleAnnotator + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  annotatorAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.roleAnnotator },
  annotatorName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  annotatorLabel: { fontSize: 11, color: COLORS.textMuted },
  labelsPreview: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  moreLabels: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'center', marginLeft: 4 },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.warning },
});
