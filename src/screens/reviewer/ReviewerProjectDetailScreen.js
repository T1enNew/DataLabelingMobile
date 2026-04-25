/**
 * ReviewerProjectDetailScreen
 * ─────────────────────────────
 * Chi tiết project + danh sách subtopic.
 * Workflow: Queue → Project Detail → Subtopic List → Task List → Review Task
 *
 * Hiển thị:
 * - project info (name, topic, dataset, deadline, status)
 * - Summary stats (total/pending/approved/rejected/rate)
 * - Subtopic list với nút "Vào review"
 * - Block Project Summary + Approve/Reject buttons ở cuối
 *
 * Rule:
 * - approval_rate = approved_tasks / total_tasks * 100
 * - >= 70% → có thể approve; < 70% → reject
 * - 2 nút chỉ hiện khi: ALL TASKS REVIEWED HOẶC PROJECT HẾT DEADLINE
 */

import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reviewerAPI, tasksAPI } from '../../services/api';
import { Screen, Card, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

// ─── Status Configs ────────────────────────────────────────────────────────────
function getProjectStatus(stats, deadline) {
  const overdue = deadline && new Date(deadline) < new Date();
  const total = stats?.total || 0;
  const reviewed = stats?.reviewed || 0;
  const pending = stats?.pending || 0;
  const rejected = stats?.rejected || 0;

  if (!stats || total === 0) return { color: COLORS.warning, label: 'Pending', icon: 'time-outline' };
  if (reviewed === total) {
    if (rejected === total) return { color: COLORS.danger, label: 'Rejected', icon: 'close-circle-outline' };
    return { color: COLORS.accent, label: 'Completed', icon: 'checkmark-done-outline' };
  }
  if (rejected > 0) return { color: COLORS.warning, label: 'Rework', icon: 'refresh-outline' };
  if (pending > 0) return { color: COLORS.primary, label: 'In Review', icon: 'eye-outline' };
  if (overdue) return { color: COLORS.danger, label: 'Overdue', icon: 'alert-circle-outline' };
  return { color: COLORS.primary, label: 'In Review', icon: 'eye-outline' };
}

const SUBTOPIC_STATUS = {
  pending:        { color: COLORS.warning, label: 'Pending',       icon: 'time-outline' },
  in_review:      { color: COLORS.primary, label: 'In Review',     icon: 'eye-outline' },
  completed:      { color: COLORS.accent,  label: 'Completed',    icon: 'checkmark-circle-outline' },
  waiting_rework: { color: COLORS.info,    label: 'Rework',       icon: 'refresh-outline' },
};

// ─── Subtopic Card ────────────────────────────────────────────────────────────
function SubtopicCard({ subtopic, onReview }) {
  const statusCfg = SUBTOPIC_STATUS[subtopic.status] || SUBTOPIC_STATUS.pending;
  const total = subtopic.totalTasks || 1;
  const progressPct = Math.min(100, Math.round(((subtopic.approved || 0) + (subtopic.rejected || 0)) / total * 100));

  return (
    <Card style={styles.subtopicCard}>
      <View style={styles.subtopicHeader}>
        <View style={styles.subtopicTitleRow}>
          <View style={[styles.subtopicIconWrap, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '44' }]}>
            <Ionicons name="layers-outline" size={16} color={statusCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtopicName} numberOfLines={1}>{subtopic.name}</Text>
            <Text style={styles.subtopicMeta}>
              {subtopic.taskCount || subtopic.totalTasks || 0} task{subtopic.totalTasks !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '66' }]}>
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Mini stats */}
      <View style={styles.subtopicStatsRow}>
        <View style={styles.subtopicStatItem}>
          <Text style={[styles.subtopicStatNum, { color: COLORS.warning }]}>{subtopic.pending || 0}</Text>
          <Text style={styles.subtopicStatLabel}>Pending</Text>
        </View>
        <View style={styles.subtopicStatDivider} />
        <View style={styles.subtopicStatItem}>
          <Text style={[styles.subtopicStatNum, { color: COLORS.accent }]}>{subtopic.approved || 0}</Text>
          <Text style={styles.subtopicStatLabel}>Approved</Text>
        </View>
        <View style={styles.subtopicStatDivider} />
        <View style={styles.subtopicStatItem}>
          <Text style={[styles.subtopicStatNum, { color: COLORS.danger }]}>{subtopic.rejected || 0}</Text>
          <Text style={styles.subtopicStatLabel}>Rejected</Text>
        </View>
        <View style={styles.subtopicStatDivider} />
        <View style={styles.subtopicStatItem}>
          <Text style={styles.subtopicStatNum}>{progressPct}%</Text>
          <Text style={styles.subtopicStatLabel}>Progress</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarWrap}>
        <View style={styles.progressBar}>
          <View key="approved" style={[styles.progressApproved, { width: `${((subtopic.approved || 0) / total) * 100}%` }]} />
          <View key="rejected" style={[styles.progressRejected, { width: `${((subtopic.rejected || 0) / total) * 100}%` }]} />
          <View key="pending" style={[styles.progressPending, { width: `${((subtopic.pending || 0) / total) * 100}%` }]} />
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity
        style={[styles.reviewBtn, (subtopic.pending || 0) === 0 && styles.reviewBtnDisabled]}
        onPress={onReview}
        activeOpacity={0.8}
        disabled={(subtopic.pending || 0) === 0}
      >
        <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
        <Text style={[styles.reviewBtnText, (subtopic.pending || 0) === 0 && styles.reviewBtnTextDisabled]}>
          {(subtopic.pending || 0) === 0 ? 'Đã hoàn thành' : 'Vào review'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectProjectModal({ visible, onClose, onConfirm, loading }) {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    if (!comment.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do từ chối project.');
      return;
    }
    onConfirm(comment.trim());
    setComment('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Từ chối Project</Text>
            <TouchableOpacity onPress={() => { onClose(); setComment(''); }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>LÝ DO TỪ CHỐI *</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Nhập lý do từ chối project..."
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { onClose(); setComment(''); }}>
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, !comment.trim() && styles.modalConfirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!comment.trim() || loading}
            >
              {loading ? (
                <Text style={styles.modalConfirmText}>Đang xử lý...</Text>
              ) : (
                <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReviewerProjectDetailScreen({ navigation, route }) {
  const { projectId } = route.params;

  const [project, setProject] = useState(null);
  const [backendStats, setBackendStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, reviewed: 0 });
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Fetch project detail + stats + subtopics in parallel
      let projectData = null;
      let statsData = { total: 0, pending: 0, approved: 0, rejected: 0, reviewed: 0 };
      let stList = [];

      // Fetch all in parallel
      const [projRes, statsRes, subRes, taskRes] = await Promise.allSettled([
        reviewerAPI.getProjectDetail(projectId),
        reviewerAPI.getProjectStats(projectId),
        reviewerAPI.getSubtopics(projectId),
        tasksAPI.getRelated(projectId),
      ]);

      // Handle project response (reviews endpoint)
      if (projRes.status === 'fulfilled') {
        projectData = projRes.value.data?.project || projRes.value.data || null;
      }

      // Get topicName/datasetName from tasks (project model has no topicId/datasetId field)
      let topicName = null;
      let datasetName = null;
      if (taskRes.status === 'fulfilled') {
        const tasks = Array.isArray(taskRes.value.data) ? taskRes.value.data
          : Array.isArray(taskRes.value.data?.tasks) ? taskRes.value.data.tasks : [];
        if (tasks.length > 0) {
          topicName = tasks[0].subtopicId?.name || tasks[0].topicName || null;
          datasetName = tasks[0].datasetId?.name || tasks[0].datasetName || null;
        }
        // Merge topicName/datasetName into projectData
        if (projectData) {
          projectData = { ...projectData, topicName, datasetName };
        }
      }

      // Handle stats response
      if (statsRes.status === 'fulfilled') {
        let rawStats = statsRes.value.data;
        if (Array.isArray(rawStats)) {
          const stMap = {};
          rawStats.forEach(s => { stMap[s._id] = s.count; });
          rawStats = { total: stMap.total || 0, pending: stMap.pending || 0, reviewed: stMap.reviewed || 0, approved: stMap.approved || 0, rejected: stMap.rejected || 0 };
        }
        statsData = {
          total: rawStats.total || 0,
          pending: rawStats.pending || 0,
          reviewed: rawStats.reviewed || 0,
          approved: rawStats.approved || 0,
          rejected: rawStats.rejected || 0,
        };
      }

      // Handle subtopics response
      if (subRes.status === 'fulfilled') {
        stList = subRes.value.data || [];
      }

      setProject(projectData);
      setBackendStats(statsData);
      setSubtopics(stList.map(st => ({
        _id: st._id,
        name: st.subtopicName || st.name,
        status: st.status,
        totalTasks: st.total || 0,
        pending: st.pending || 0,
        approved: st.approved || 0,
        rejected: st.rejected || 0,
      })));
    } catch (e) {
      console.error('Load project error:', e);
      setLoadError(e.message || 'Server error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(useCallback(() => { loadProject(); }, [loadProject]));

  // ─── Computed stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let total, pending, approved, rejected;

    if (backendStats.total > 0 || backendStats.pending > 0 || backendStats.approved > 0 || backendStats.rejected > 0) {
      total = backendStats.total;
      pending = backendStats.pending;
      approved = backendStats.approved;
      rejected = backendStats.rejected;
    } else if (subtopics.length > 0) {
      total = subtopics.reduce((s, st) => s + (st.totalTasks || 0), 0);
      pending = subtopics.reduce((s, st) => s + (st.pending || 0), 0);
      approved = subtopics.reduce((s, st) => s + (st.approved || 0), 0);
      rejected = subtopics.reduce((s, st) => s + (st.rejected || 0), 0);
    } else {
      // Fall back to projectReviewSnapshot
      const pr = project?.projectReviewSnapshot?.totals || project?.projectReview || {};
      total = pr.total || 0;
      pending = pr.pending || 0;
      approved = pr.approved || 0;
      rejected = pr.rejected || 0;
    }

    const reviewed = approved + rejected;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const allReviewed = pending === 0;
    const pastDeadline = project?.deadline ? new Date(project.deadline) < new Date() : false;
    const canDecide = allReviewed || pastDeadline;
    return { total, pending, approved, rejected, reviewed, rate, allReviewed, pastDeadline, canDecide };
  }, [backendStats, subtopics, project]);

  const projectStats = useMemo(() => ({
    total: backendStats.total || 0,
    pending: backendStats.pending || 0,
    reviewed: backendStats.reviewed || 0,
    approved: backendStats.approved || 0,
    rejected: backendStats.rejected || 0,
  }), [backendStats]);

  // Use same deadline-aware status logic as Queue screen for consistency
  const statusCfg = getProjectStatus(projectStats, project?.deadline);

  // ─── Decision handlers ────────────────────────────────────────────────────
  const handleApproveProject = () => {
    if (stats.rate < 70) {
      Alert.alert(
        'Không thể duyệt',
        `Tỷ lệ duyệt hiện tại (${stats.rate}%) thấp hơn mức tối thiểu 70%. Vui lòng reject project này.`
      );
      return;
    }
    Alert.alert('Duyệt Project', 'Xác nhận duyệt project này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt',
        onPress: async () => {
          setDecisionLoading(true);
          try {
            await reviewerAPI.approveProject(projectId, {});
            Alert.alert('Thành công', 'Project đã được duyệt.');
            await loadProject();
          } catch (e) {
            Alert.alert('Lỗi', e.message);
          } finally {
            setDecisionLoading(false);
          }
        }
      }
    ]);
  };

  const handleRejectProject = (comment) => {
    setDecisionLoading(true);
    setShowRejectModal(false);
    // Proceed without await, handle async separately
    (async () => {
      try {
        await reviewerAPI.rejectProject(projectId, { comment });
        Alert.alert('Thành công', 'Project đã bị từ chối.');
        await loadProject();
      } catch (e) {
        Alert.alert('Lỗi', e.message);
      } finally {
        setDecisionLoading(false);
      }
    })();
  };

  if (loading) return <Screen><Loading /></Screen>;
  if (loadError) return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <EmptyState
        icon="alert-circle-outline"
        title="Lỗi tải dữ liệu"
        message={loadError}
      />
    </Screen>
  );
  if (!project) return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <EmptyState icon="alert-circle-outline" title="Không tìm thấy" message="Project này không tồn tại." />
    </Screen>
  );

  return (
    <Screen>
      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.screenTitle} numberOfLines={1}>{project.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '66' }]}>
            <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Project Info ── */}
        <Text style={styles.sectionLabel}>THÔNG TIN PROJECT</Text>
        <Card>
          {[
            {
              icon: 'calendar-outline',
              label: 'Deadline',
              value: project.deadline ? new Date(project.deadline).toLocaleDateString('vi-VN') : '—',
              valueColor: stats.pastDeadline ? COLORS.danger : undefined
            },
            { icon: 'checkmark-done-outline', label: 'Trạng thái', value: statusCfg.label },
          ].map((row, i) => (
            <View key={`info-row-${row.label}-${i}`} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name={row.icon} size={15} color={COLORS.textMuted} />
                <Text style={styles.infoLabel}>{row.label}</Text>
              </View>
              <Text style={[styles.infoValue, row.valueColor && { color: row.valueColor }]}>{row.value}</Text>
            </View>
          ))}
        </Card>

        {/* ── Summary Stats ── */}
        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <Card>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{stats.total}</Text>
              <Text style={styles.statBoxLabel}>Total Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxNum, { color: COLORS.warning }]}>{stats.pending}</Text>
              <Text style={styles.statBoxLabel}>Can Review</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxNum, { color: COLORS.accent }]}>{stats.approved}</Text>
              <Text style={styles.statBoxLabel}>Approved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxNum, { color: COLORS.danger }]}>{stats.rejected}</Text>
              <Text style={styles.statBoxLabel}>Rejected</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{stats.reviewed}</Text>
              <Text style={styles.statBoxLabel}>Reviewed</Text>
            </View>
          </View>

          {/* Overall progress bar */}
          {stats.total > 0 && (
            <View style={styles.progressRow}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressLabel}>Review Progress</Text>
                <Text style={styles.progressValue}>{stats.reviewed}/{stats.total}</Text>
              </View>
              <View style={styles.overallProgressWrap}>
                <View style={styles.overallProgressBar}>
                  <View style={[styles.progressBarFill, {
                    width: `${Math.min(100, Math.round((stats.reviewed / stats.total) * 100))}%`,
                    backgroundColor: stats.reviewed === stats.total ? COLORS.accent : COLORS.primary,
                  }]} />
                </View>
                <Text style={styles.progressPct}>
                  {Math.round((stats.reviewed / stats.total) * 100)}%
                </Text>
              </View>
            </View>
          )}

          {/* Approval rate */}
          <View style={styles.rateRow}>
            <View style={styles.rateLeft}>
              <Text style={styles.rateLabel}>Approval Rate</Text>
              <Text style={[
                styles.rateValue,
                { color: stats.rate >= 70 ? COLORS.accent : stats.rate >= 50 ? COLORS.warning : COLORS.danger }
              ]}>
                {stats.rate}%
              </Text>
            </View>
            <View style={styles.rateBarWrap}>
              <View style={styles.rateBar}>
                <View style={[styles.rateBarFill, {
                  width: `${stats.rate}%`,
                  backgroundColor: stats.rate >= 70 ? COLORS.accent : stats.rate >= 50 ? COLORS.warning : COLORS.danger
                }]} />
                <View style={[styles.rateThresholdLine, { left: '70%' }]} />
              </View>
              <Text style={styles.rateThresholdLabel}>70% threshold</Text>
            </View>
          </View>
        </Card>

        {/* ── Subtopic List ── */}
        <Text style={styles.sectionLabel}>SUBTOPICS ({subtopics.length})</Text>
        {subtopics.length === 0 ? (
          <Card><Text style={styles.noData}>Chưa có subtopic nào.</Text></Card>
        ) : (
          subtopics.map(st => (
            <SubtopicCard
              key={st._id}
              subtopic={st}
              onReview={() => navigation.navigate('ReviewerSubtopic', {
                subtopicId: st._id,
                subtopicName: st.name || st.subtopicName || 'Subtopic',
                projectId,
                projectName: project.name,
              })}
            />
          ))
        )}

        {/* ── Project Decision ── */}
        <Text style={styles.sectionLabel}>PROJECT DECISION</Text>
        <Card style={styles.decisionCard}>
          <View style={styles.decisionHint}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.decisionHintText}>
              {stats.canDecide
                ? 'Bạn có thể đưa ra quyết định cho project này.'
                : 'Cần hoàn thành toàn bộ task hoặc hết deadline mới có thể đưa ra quyết định.'}
            </Text>
          </View>
          {stats.canDecide && (
            <View style={styles.decisionButtons}>
              <TouchableOpacity
                style={[styles.decisionBtn, styles.approveBtn, stats.rate < 70 && styles.decisionBtnDisabled]}
                onPress={handleApproveProject}
                disabled={decisionLoading}
              >
                <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                <Text style={[styles.decisionBtnText, styles.approveBtnText]}>
                  Approve Project
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.decisionBtn, styles.rejectBtn]}
                onPress={() => setShowRejectModal(true)}
                disabled={decisionLoading}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                <Text style={[styles.decisionBtnText, styles.rejectBtnText]}>
                  Reject Project
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!stats.canDecide && (
            <View style={styles.waitingBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.warning} />
              <Text style={styles.waitingBadgeText}>
                Đang chờ {stats.pending} task{stats.pending !== 1 ? 's' : ''} còn lại
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* ── Reject Modal ── */}
      <RejectProjectModal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectProject}
        loading={decisionLoading}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 120 },

  header: {
    paddingTop: 52, paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
    marginBottom: SPACING.md,
  },
  headerContent: { gap: SPACING.sm },
  screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: SPACING.md },

  // Stats grid — 5 columns like web (use flex basis instead of width% to avoid gap overflow)
  statsGrid: { flexDirection: 'row', marginBottom: SPACING.md },
  statBox: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs, alignItems: 'center' },
  statBoxNum: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statBoxLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Overall progress bar
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.md },
  progressLeft: { minWidth: 80 },
  progressLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  progressPct: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  overallProgressWrap: { flex: 1, gap: 4 },
  overallProgressBar: {
    height: 8, backgroundColor: COLORS.bgElevated,
    borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%' },

  // Rate
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  rateLeft: { minWidth: 80 },
  rateLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rateValue: { fontSize: 28, fontWeight: '800' },
  rateBarWrap: { flex: 1, gap: 4, alignItems: 'stretch' },
  rateBar: {
    width: '100%', height: 8, backgroundColor: COLORS.bgElevated,
    borderRadius: 4, overflow: 'hidden', position: 'relative',
  },
  rateBarFill: { height: '100%', borderRadius: 0 },
  rateThresholdLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: COLORS.textMuted + '88',
  },
  rateThresholdLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'right', fontWeight: '600' },

  // Subtopic card
  subtopicCard: { marginBottom: SPACING.md, padding: SPACING.lg },
  subtopicHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  subtopicTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  subtopicIconWrap: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  subtopicName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  subtopicMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  subtopicStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, marginBottom: SPACING.sm,
  },
  subtopicStatItem: { flex: 1, alignItems: 'center' },
  subtopicStatNum: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  subtopicStatLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtopicStatDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
  progressBarWrap: { marginBottom: SPACING.sm },
  progressBar: {
    height: 5, borderRadius: 2.5, backgroundColor: COLORS.bgElevated,
    flexDirection: 'row', overflow: 'hidden',
  },
  progressApproved: { height: '100%', backgroundColor: COLORS.accent },
  progressRejected: { height: '100%', backgroundColor: COLORS.danger },
  progressPending:  { height: '100%', backgroundColor: COLORS.warning },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  reviewBtnDisabled: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.border },
  reviewBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  reviewBtnTextDisabled: { color: COLORS.textMuted },

  // Decision
  decisionCard: { padding: SPACING.lg },
  decisionHint: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.md },
  decisionHintText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  decisionButtons: { flexDirection: 'row', gap: SPACING.md },
  decisionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1,
  },
  decisionBtnDisabled: { opacity: 0.5 },
  approveBtn: {
    backgroundColor: COLORS.accentGlow, borderColor: COLORS.accent + '66',
  },
  rejectBtn: {
    backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger + '66',
  },
  decisionBtnText: { fontSize: 13, fontWeight: '700' },
  approveBtnText: { color: COLORS.accent },
  rejectBtnText: { color: COLORS.danger },
  waitingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, justifyContent: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.warning + '44',
    backgroundColor: COLORS.warningGlow,
  },
  waitingBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },

  noData: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },

  // Reject modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  modalInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 100,
    textAlignVertical: 'top', marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn: {
    flex: 1, paddingVertical: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  modalConfirmBtn: {
    flex: 2, paddingVertical: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.danger,
  },
  modalConfirmBtnDisabled: { opacity: 0.5 },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
