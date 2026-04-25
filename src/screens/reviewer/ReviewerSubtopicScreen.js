/**
 * ReviewerSubtopicScreen - Task list per subtopic
 * Workflow: Queue -> Project Detail -> Subtopic -> Task List -> Review Task
 * Uses /api/reviews/pending?subtopicId=... (same as web Task.jsx)
 */
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { reviewsAPI, BASE_URL } from '../../services/api';
import { Screen, Card, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const TASK_STATUS = {
  pending_review:      { color: COLORS.warning,  label: 'Pending',     icon: 'time-outline' },
  partially_reviewed:  { color: COLORS.info,     label: 'Partial',    icon: 'eye-outline' },
  fully_reviewed:      { color: COLORS.accent,   label: 'Done',       icon: 'checkmark-circle-outline' },
  waiting_rework:      { color: COLORS.primary,  label: 'Rework',     icon: 'refresh-outline' },
};

function buildImageUrl(dataItem) {
  if (!dataItem) return null;
  const base = BASE_URL.replace(/\/+$/, '');
  const rawPath = dataItem.path || '';
  const cleanPath = rawPath.replace(/^\/+/, '');
  if (cleanPath) {
    if (dataItem.filename && cleanPath.endsWith(dataItem.filename)) return `${base}/${cleanPath}`;
    return dataItem.filename ? `${base}/${cleanPath}/${dataItem.filename}` : `${base}/${cleanPath}`;
  }
  return dataItem.filename ? `${base}/uploads/datasets/${dataItem.filename}` : null;
}

function getFileType(dataItem) {
  const mime = dataItem?.mimeType || '';
  const fn = dataItem?.filename || '';
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fn)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(fn)) return 'audio';
  if (/\.(txt|csv|json|xml)$/i.test(fn)) return 'text';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/')) return 'text';
  return 'other';
}

function getAnnotatorStatus(task) {
  if (task.status === 'approved') return 'approved';
  if (task.status === 'rejected') return 'rejected';
  return 'pending';
}

function updateItemStatus(item) {
  const subs = item.submissions || [];
  const approved = subs.filter(s => s.status === 'approved').length;
  const rejected = subs.filter(s => s.status === 'rejected').length;
  const pending = subs.filter(s => s.status === 'pending').length;
  const reviewed = approved + rejected;
  if (reviewed === 0) { item.status = 'pending_review'; }
  else if (reviewed === subs.length) { item.status = rejected > 0 && pending === 0 ? 'waiting_rework' : 'fully_reviewed'; }
  else { item.status = 'partially_reviewed'; }
}


function TaskCard({ item, onPress }) {
  const statusCfg = TASK_STATUS[item.status] || TASK_STATUS.pending_review;
  const thumbUrl = buildImageUrl(item.dataItem);
  const fileType = getFileType(item.dataItem);
  const pendingCount = (item.submissions || []).filter(s => s.status === 'pending').length;
  const approvedCount = (item.submissions || []).filter(s => s.status === 'approved').length;
  const rejectedCount = (item.submissions || []).filter(s => s.status === 'rejected').length;

  return (
    <Card style={styles.taskCard} onPress={onPress}>
      <View style={styles.taskRow}>
        <View style={[styles.thumbWrap, { backgroundColor: COLORS.bgElevated }]}>
          {thumbUrl ? (
            <Image source={{ uri: thumbUrl }} style={styles.thumb} resizeMode="cover" />
          ) : fileType === 'audio' ? (
            <Ionicons name="musical-notes" size={24} color={COLORS.textMuted} />
          ) : fileType === 'text' ? (
            <Ionicons name="document-text" size={24} color={COLORS.textMuted} />
          ) : (
            <Ionicons name="image" size={24} color={COLORS.textMuted} />
          )}
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskName} numberOfLines={1}>{item.filename || 'Task'}</Text>
          <Text style={styles.annotatorCount}>{item.submissions?.length || 0} annotator{item.submissions?.length !== 1 ? 's' : ''}</Text>
          <View style={styles.subStats}>
            {pendingCount > 0 && <Text style={[styles.subBadge, { color: COLORS.warning }]}>{pendingCount} pending</Text>}
            {approvedCount > 0 && <Text style={[styles.subBadge, { color: COLORS.accent }]}>{approvedCount} approved</Text>}
            {rejectedCount > 0 && <Text style={[styles.subBadge, { color: COLORS.danger }]}>{rejectedCount} rejected</Text>}
          </View>
        </View>
        <View style={styles.taskRight}>
          <View style={[styles.statusBadge, { borderColor: statusCfg.color + '66', backgroundColor: statusCfg.color + '22' }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>
    </Card>
  );
}

export default function ReviewerSubtopicScreen({ navigation, route }) {
  const { projectId, subtopicId, subtopicName } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      // Gửi subtopicId lên backend, backend đã hỗ trợ subtopicId query param
      const res = await reviewsAPI.getPending({ subtopicId });
      let taskList = res.data || [];
      if (!Array.isArray(taskList)) taskList = [];

      // Client-side filter: chỉ lấy tasks thuộc project hiện tại
      if (projectId) {
        taskList = taskList.filter(t => String(t.projectId?._id || t.projectId) === projectId);
      }

      // Client-side filter: chỉ lấy tasks thuộc subtopic hiện tại
      if (subtopicId) {
        taskList = taskList.filter(t => String(t.subtopicId?._id || t.subtopicId) === subtopicId);
      }

      // Group by dataItem (same logic as web Task.jsx)
      const itemMap = new Map();
      taskList.forEach(task => {
        const itemKey = task.dataItem?.filename || task.dataItem?.path || task._id;
        const color = stringToColor(task.annotatorId?._id || task.annotatorId || task._id);

        if (!itemMap.has(itemKey)) {
          itemMap.set(itemKey, {
            itemId: itemKey,
            filename: task.dataItem?.filename || 'Unknown',
            dataItem: task.dataItem,
            kind: getFileType(task.dataItem),
            status: 'pending_review',
            submissions: [],
          });
        }

        const item = itemMap.get(itemKey);
        item.submissions.push({
          submissionId: task._id,
          annotatorId: task.annotatorId?._id || task.annotatorId,
          annotatorName: task.annotatorId?.fullName || task.annotatorId?.username || 'Annotator',
          status: getAnnotatorStatus(task),
          labels: task.labels || {},
          feedback: task.reviewComments || '',
          color,
          task,
        });
        updateItemStatus(item);
      });

      const itemList2 = Array.from(itemMap.values());
      const order = { pending_review: 0, partially_reviewed: 1, waiting_rework: 2, fully_reviewed: 3 };
      itemList2.sort((a, b) => (order[a.status] || 5) - (order[b.status] || 5));
      setItems(itemList2);
    } catch (e) {
      console.error('Load tasks error:', e);
      Alert.alert('Lỗi', 'Không thể tải danh sách task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, subtopicId]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const renderItem = useCallback(({ item }) => (
    <TaskCard
      item={item}
      onPress={() => navigation.navigate('ReviewerTasks', {
        projectId,
        subtopicId,
        subtopicName,
        itemId: item.itemId,
        dataItem: item.dataItem,
        submissions: item.submissions,
      })}
    />
  ), [navigation, projectId, subtopicId, subtopicName]);

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerName} numberOfLines={1}>{subtopicName || 'Subtopic'}</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState icon="clipboard-outline" title="Không có task" message="Không có task nào trong subtopic này." />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.itemId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function stringToColor(str) {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  taskCard: { marginTop: SPACING.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  thumbWrap: { width: 56, height: 56, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: SPACING.md },
  thumb: { width: '100%', height: '100%' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  annotatorCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  subStats: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4 },
  subBadge: { fontSize: 10, fontWeight: '600' },
  taskRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '600' },
});
