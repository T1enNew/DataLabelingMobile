/**
 * ReviewerQueueScreen
 * ─────────────────────
 * Màn hình queue hiển thị danh sách PROJECT cần review.
 * Workflow: Queue → Chọn Project → Project Detail → Chọn Subtopic → Task List → Review Task
 *
 * Mỗi project card gồm:
 * - project name, topic name, số subtopic, total tasks, pending/approved/rejected, approval rate, status
 * - nút "Xem chi tiết" → ReviewerProjectDetailScreen
 *
 * Filter: status, data type, topic
 * KHÔNG có nút Approve/Reject project trong màn queue.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reviewerAPI, tasksAPI } from '../../services/api';
import { Screen, Card, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

// ─── Status Config ───────────────────────────────────────────────────────────
const PROJECT_STATUS = {
  pending:       { color: COLORS.warning,          label: 'Pending',        icon: 'time-outline' },
  in_review:     { color: COLORS.primary,          label: 'In Review',     icon: 'eye-outline' },
  active:        { color: COLORS.info,             label: 'Active',         icon: 'play-circle-outline' },
  waiting_rework:{ color: COLORS.info,             label: 'Rework',        icon: 'refresh-outline' },
  completed:     { color: COLORS.accent,           label: 'Completed',     icon: 'checkmark-done-outline' },
  approved:      { color: COLORS.accent,           label: 'Approved',      icon: 'checkmark-circle-outline' },
  rejected:      { color: COLORS.danger,           label: 'Rejected',      icon: 'close-circle-outline' },
  expired:       { color: COLORS.textMuted,        label: 'Expired',       icon: 'alert-circle-outline' },
  overdue:       { color: COLORS.danger,           label: 'Qua han',      icon: 'alert-circle-outline' },
};

// ─── Status Helper (mirrors web ProjectList.jsx getProjectStatus) ────────────
// Kiểm tra deadline dựa trên stats và deadline thực tế của project
// Web gốc kiểm tra deadline SAU khi xét hết các điều kiện reviewed/pending/rejected
function getProjectStatus(stats, deadline) {
  const overdue = deadline && new Date(deadline) < new Date();
  const total = stats?.total || 0;
  const reviewed = stats?.reviewed || 0;
  const pending = stats?.pending || 0;
  const rejected = stats?.rejected || 0;

  if (!stats || total === 0) return PROJECT_STATUS.pending;
  if (reviewed === total) {
    if (rejected === total) {
      return { color: COLORS.danger, label: 'Da reject het', icon: 'close-circle-outline' };
    }
    return PROJECT_STATUS.completed;
  }
  if (rejected > 0) return { color: COLORS.warning, label: 'Cho annotator sua lai', icon: 'refresh-outline' };
  if (pending > 0) return { color: COLORS.primary, label: 'Dang review', icon: 'eye-outline' };
  if (overdue) return PROJECT_STATUS.overdue;
  return { color: COLORS.primary, label: 'Dang review', icon: 'eye-outline' };
}

// ─── Filter Options ───────────────────────────────────────────────────────────
const STATUS_FILTER_OPTIONS = [
  { key: 'all',          label: 'Tất cả' },
  { key: 'pending',      label: 'Cần review' },
  { key: 'reviewed',     label: 'Đã xong' },
  { key: 'has_rejected', label: 'Bị reject' },
  { key: 'overdue',      label: 'Qua hạn' },
];

const DATA_TYPE_OPTIONS = [
  { key: 'all',   label: 'Tất cả loại', icon: 'apps-outline' },
  { key: 'image', label: 'Image',        icon: 'image-outline', color: '#4FC3F7' },
  { key: 'text',  label: 'Text',         icon: 'document-text-outline', color: '#A78BFA' },
  { key: 'audio', label: 'Audio',        icon: 'musical-notes-outline', color: '#FFB74D' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcApprovalRate(approved, total) {
  if (!total || total === 0) return 0;
  return Math.round((approved / total) * 100);
}

function getDataTypeIcon(mimeType) {
  if (!mimeType) return { icon: 'document-outline', color: COLORS.textMuted, bg: COLORS.bgElevated, border: COLORS.border };
  if (mimeType.startsWith('image/')) return { icon: 'image', color: '#4FC3F7', bg: 'rgba(79,195,247,0.15)', border: 'rgba(79,195,247,0.40)' };
  if (mimeType.startsWith('text/')) return { icon: 'document-text', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.40)' };
  if (mimeType.startsWith('audio/')) return { icon: 'musical-notes', color: '#FFB74D', bg: 'rgba(255,183,77,0.15)', border: 'rgba(255,183,77,0.40)' };
  return { icon: 'document-outline', color: COLORS.textMuted, bg: COLORS.bgElevated, border: COLORS.border };
}

// ─── Project Card ────────────────────────────────────────────────────────────
function ProjectCard({ project, onPress }) {
  // Use getProjectStatus like web (checks deadline against stats, not project.status field)
  const projectStats = {
    total: project.totalTasks || 0,
    pending: project.pendingReview || 0,
    reviewed: project.reviewed || 0,
    approved: project.approved || 0,
    rejected: project.rejected || 0,
  };
  const statusCfg = getProjectStatus(projectStats, project.deadline);
  const approvalRate = calcApprovalRate(project.approved || 0, project.totalTasks || 0);
  const dataTypeIcon = getDataTypeIcon(project.dataType);
  const subtopicCount = project.subtopicCount || 0;

  // Progress bar
  const total = project.totalTasks || 1;
  const pendingPct  = ((project.pendingReview || 0) / total) * 100;
  const approvedPct = ((project.approved || 0) / total) * 100;
  const rejectedPct = ((project.rejected || 0) / total) * 100;

  return (
    <Card
      style={styles.projectCard}
      onPress={onPress}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.typeBadge, { backgroundColor: dataTypeIcon.bg, borderColor: dataTypeIcon.border }]}>
            <Ionicons name={dataTypeIcon.icon} size={14} color={dataTypeIcon.color} />
          </View>
          <Text style={styles.projectName} numberOfLines={1}>{project.name || 'Untitled Project'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '66' }]}>
          <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Topic */}
      <View style={styles.metaRow}>
        <Ionicons name="layers-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {project.topicName || '—'} • {subtopicCount} subtopic{subtopicCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressApproved,  { width: `${approvedPct}%` }]} />
          <View style={[styles.progressRejected,  { width: `${rejectedPct}%` }]} />
          <View style={[styles.progressPending,   { width: `${pendingPct}%` }]} />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{project.pendingReview || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.accent }]}>{project.approved || 0}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.danger }]}>{project.rejected || 0}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: approvalRate >= 70 ? COLORS.accent : approvalRate >= 50 ? COLORS.warning : COLORS.danger }]}>
            {approvalRate}%
          </Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{project.totalTasks || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity style={styles.detailBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.detailBtnText}>Xem chi tiết</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────
function FilterModal({ visible, onClose, filters, onApply }) {
  const [local, setLocal] = useState(filters);

  const toggleStatus = (key) => {
    if (key === 'all') {
      setLocal(prev => ({ ...prev, status: 'all' }));
    } else {
      setLocal(prev => ({
        ...prev,
        status: prev.status === key ? 'all' : key,
      }));
    }
  };

  const toggleDataType = (key) => {
    setLocal(prev => ({ ...prev, dataType: prev.dataType === key ? 'all' : key }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.filterModalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Bộ lọc</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <Text style={styles.filterSectionLabel}>TRẠNG THÁI</Text>
            <View style={styles.filterChips}>
              {STATUS_FILTER_OPTIONS.map(opt => {
                const active = local.status === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => toggleStatus(opt.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Data Type Filter */}
            <Text style={styles.filterSectionLabel}>LOẠI DỮ LIỆU</Text>
            <View style={styles.filterChips}>
              {DATA_TYPE_OPTIONS.map(opt => {
                const active = local.dataType === opt.key;
                const color = opt.color || COLORS.textSecondary;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, active && styles.filterChipActive, active && { borderColor: `${color}88`, backgroundColor: `${color}15` }]}
                    onPress={() => toggleDataType(opt.key)}
                  >
                    <Ionicons name={opt.icon} size={12} color={active ? color : COLORS.textMuted} />
                    <Text style={[styles.filterChipText, active && { color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterResetBtn}
              onPress={() => setLocal({ status: 'all', dataType: 'all', topic: '', search: '' })}
            >
              <Text style={styles.filterResetText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={() => { onApply(local); onClose(); }}
            >
              <Text style={styles.filterApplyText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReviewerQueueScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ status: 'all', dataType: 'all', topic: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const loadProjects = useCallback(async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        reviewerAPI.getQueue(),
        reviewerAPI.getAllStats().catch(() => ({ data: { stats: [] } })),
      ]);

      const raw = Array.isArray(queueRes.data) ? queueRes.data : (queueRes.data?.projects || []);
      const statsArr = Array.isArray(statsRes.data?.stats) ? statsRes.data.stats : [];

      const statsMap = {};
      statsArr.forEach(s => { statsMap[s.projectId] = s; });

      // Batch-fetch subtopics and task metadata for every project in parallel
      const projectIds = raw.map(p => p._id);
      const [subtopicResults, taskResults] = await Promise.allSettled([
        Promise.all(projectIds.map(id => reviewerAPI.getSubtopics(id).then(r => ({ id, subs: r.data || [] })).catch(() => ({ id, subs: [] })))),
        Promise.all(projectIds.map(id => tasksAPI.getRelated(id).then(r => ({ id, tasks: r.data || [] })).catch(() => ({ id, tasks: [] })))),
      ]);

      const subtopicMap = {};
      (subtopicResults.status === 'fulfilled' ? subtopicResults.value : []).forEach(({ id, subs }) => { subtopicMap[id] = subs; });

      const taskMetaMap = {};
      (taskResults.status === 'fulfilled' ? taskResults.value : []).forEach(({ id, tasks }) => {
        const first = Array.isArray(tasks) && tasks.length > 0 ? tasks[0] : null;
        taskMetaMap[id] = {
          topicName: first?.topicId?.name || first?.topicName || '—',
          datasetName: first?.datasetId?.name || first?.datasetName || '—',
          dataType: first?.dataType || first?.datasetId?.dataType || '',
        };
      });

      const mapped = raw.map(p => {
        const st = statsMap[p._id] || p.stats || {};
        const subs = subtopicMap[p._id] || [];
        const meta = taskMetaMap[p._id] || {};
        return {
          _id: p._id,
          name: p.name,
          status: p.status,
          topicId: p.topicId?._id || p.topicId,
          topicName: meta.topicName || '—',
          datasetName: meta.datasetName || '—',
          deadline: p.deadline,
          totalTasks: st.total || 0,
          pendingReview: st.pending || 0,
          reviewed: st.reviewed || 0,
          approved: st.approved || 0,
          rejected: st.rejected || 0,
          subtopicCount: subs.length,
          dataType: meta.dataType || p.dataType || '',
          guidelines: p.guidelines,
        };
      });
      setProjects(mapped);
    } catch (e) {
      console.error('Load projects error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProjects(); }, [loadProjects]));

  useEffect(() => {
    const count = (filters.status !== 'all' ? 1 : 0) + (filters.dataType !== 'all' ? 1 : 0) + (filters.topic ? 1 : 0);
    setActiveFiltersCount(count);
  }, [filters]);

  // Filtered list — mirrors web ProjectList.jsx filter logic
  const filtered = useMemo(() => {
    let list = projects;

    // Search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.topicName || '').toLowerCase().includes(q)
      );
    }

    // Status filter using deadline-aware getProjectStatus
    if (filters.status !== 'all') {
      list = list.filter(p => {
        const ps = {
          total: p.totalTasks || 0,
          pending: p.pendingReview || 0,
          reviewed: p.reviewed || 0,
          approved: p.approved || 0,
          rejected: p.rejected || 0,
        };
        const overdue = p.deadline && new Date(p.deadline) < new Date();

        if (filters.status === 'pending') return ps.pending > 0;
        if (filters.status === 'reviewed') return ps.reviewed === ps.total && ps.total > 0;
        if (filters.status === 'has_rejected') return ps.rejected > 0;
        if (filters.status === 'overdue') return overdue;
        return true;
      });
    }

    // Data type
    if (filters.dataType !== 'all') {
      list = list.filter(p => (p.dataType || '').startsWith(filters.dataType));
    }

    // Topic
    if (filters.topic) {
      list = list.filter(p => p.topicId === filters.topic);
    }

    return list;
  }, [projects, searchText, filters]);

  // Summary stats — mirrors web
  const summary = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, overdueCount = 0;
    projects.forEach(p => {
      const isOverdue = p.deadline && new Date(p.deadline) < new Date();
      const ps = { total: p.totalTasks || 0, pending: p.pendingReview || 0, reviewed: p.reviewed || 0, approved: p.approved || 0, rejected: p.rejected || 0 };
      const st = getProjectStatus(ps, p.deadline);
      if (ps.pending > 0) pending++;
      if (st.label === 'Da review xong' || st.label === 'Completed') approved++;
      if (ps.rejected > 0) rejected++;
      if (isOverdue) overdueCount++;
    });
    return { total: projects.length, pending, approved, rejected, overdue: overdueCount };
  }, [projects]);

  // Filter tab counts — mirrors web counts
  const filterCounts = useMemo(() => {
    const counts = { all: projects.length, pending: 0, reviewed: 0, has_rejected: 0, overdue: 0 };
    projects.forEach(p => {
      const isOverdue = p.deadline && new Date(p.deadline) < new Date();
      const ps = { total: p.totalTasks || 0, pending: p.pendingReview || 0, reviewed: p.reviewed || 0, approved: p.approved || 0, rejected: p.rejected || 0 };
      if (ps.pending > 0) counts.pending++;
      if (ps.reviewed === ps.total && ps.total > 0) counts.reviewed++;
      if (ps.rejected > 0) counts.has_rejected++;
      if (isOverdue) counts.overdue++;
    });
    return counts;
  }, [projects]);

  const renderProject = useCallback(({ item }) => (
    <ProjectCard
      project={item}
      onPress={() => navigation.navigate('ReviewerProjectDetail', { projectId: item._id })}
    />
  ), [navigation]);

  if (loading) return <Screen><Loading /></Screen>;

    return (
    <Screen>
      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Review Queue</Text>
          <TouchableOpacity
            style={[styles.filterToggle, activeFiltersCount > 0 && styles.filterToggleActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={18} color={activeFiltersCount > 0 ? COLORS.primary : COLORS.textSecondary} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary chips */}
        <View style={styles.summaryChips}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipNum}>{summary.total}</Text>
            <Text style={styles.summaryChipLabel}>Projects</Text>
              </View>
          <View style={styles.summaryChipDivider} />
          <View style={styles.summaryChip}>
            <Text style={[styles.summaryChipNum, { color: COLORS.warning }]}>{summary.pending}</Text>
            <Text style={styles.summaryChipLabel}>Cần review</Text>
            </View>
          <View style={styles.summaryChipDivider} />
          <View style={styles.summaryChip}>
            <Text style={[styles.summaryChipNum, { color: COLORS.accent }]}>{summary.approved}</Text>
            <Text style={styles.summaryChipLabel}>Đã duyệt</Text>
          </View>
          <View style={styles.summaryChipDivider} />
          <View style={styles.summaryChip}>
            <Text style={[styles.summaryChipNum, { color: COLORS.danger }]}>{summary.rejected}</Text>
            <Text style={styles.summaryChipLabel}>Từ chối</Text>
          </View>
        </View>

        {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
            placeholder="Tìm project..."
          placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
        />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsScroll} contentContainerStyle={styles.filterTabsContent}>
          {STATUS_FILTER_OPTIONS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                filters.status === tab.key && styles.filterTabActive,
              ]}
              onPress={() => setFilters(prev => ({ ...prev, status: tab.key }))}
            >
              <Text style={[
                styles.filterTabText,
                filters.status === tab.key && styles.filterTabTextActive,
              ]}>
                {tab.label}
              </Text>
              <View style={[
                styles.filterTabBadge,
                filters.status === tab.key && styles.filterTabBadgeActive,
              ]}>
                <Text style={[
                  styles.filterTabBadgeText,
                  filters.status === tab.key && styles.filterTabBadgeTextActive,
                ]}>
                  {filterCounts[tab.key] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── Project List ── */}
      <FlatList
        data={filtered}
        renderItem={renderProject}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadProjects(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="Không có project"
            message="Không có project nào phù hợp với bộ lọc hiện tại."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── Filter Modal (for data type) ── */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={setFilters}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingTop: 52, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  filterToggle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  filterToggleActive: {
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primaryGlow,
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  summaryChips: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
    gap: 0,
  },
  summaryChip: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  summaryChipNum: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  summaryChipLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  summaryChipDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterTabsScroll: { marginTop: SPACING.sm },
  filterTabsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.xs, flexDirection: 'row' },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    marginRight: SPACING.xs,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary + '88',
  },
  filterTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.primary },
  filterTabBadge: {
    backgroundColor: COLORS.bgElevated, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterTabBadgeActive: { backgroundColor: COLORS.primary + '22' },
  filterTabBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  filterTabBadgeTextActive: { color: COLORS.primary },
  listContent: { padding: SPACING.lg, paddingBottom: 120 },

  // Project Card
  projectCard: { marginBottom: SPACING.md, padding: SPACING.lg },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  typeBadge: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  projectName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: SPACING.sm,
  },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  progressBarWrap: { marginBottom: SPACING.sm },
  progressBar: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.bgElevated,
    flexDirection: 'row', overflow: 'hidden',
  },
  progressApproved:  { height: '100%', backgroundColor: COLORS.accent },
  progressRejected:  { height: '100%', backgroundColor: COLORS.danger },
  progressPending:   { height: '100%', backgroundColor: COLORS.warning },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, marginBottom: SPACING.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Filter Modal
  filterModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40,
    maxHeight: '75%',
  },
  filterModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  filterModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  filterSectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  filterChipActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary + '88' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.primary },
  filterActions: {
    flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl,
    paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  filterResetBtn: {
    flex: 1, paddingVertical: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  filterResetText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  filterApplyBtn: {
    flex: 2, paddingVertical: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  filterApplyText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
