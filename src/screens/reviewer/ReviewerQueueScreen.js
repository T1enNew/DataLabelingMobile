import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAPI, projectsAPI } from '../../services/api';
import { Screen, Card, Loading, EmptyState } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const PROJECT_APPROVE_THRESHOLD = 0.7;
const PROJECT_REJECT_THRESHOLD = 0.3;

export default function ReviewerQueueScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedAnnotatorIdsByProject, setSelectedAnnotatorIdsByProject] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucketFilter, setSelectedBucketFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [reviewedTasks, setReviewedTasks] = useState([]);
  const [projectMeta, setProjectMeta] = useState({});
  const [projectActionLoading, setProjectActionLoading] = useState({});

  const loadTasks = useCallback(async () => {
    try {
      const [pendingRes, reviewedRes, projectsRes] = await Promise.all([
        reviewsAPI.getPending(),
        reviewsAPI.getReviewed(),
        projectsAPI.getAll(),
      ]);
      setTasks(pendingRes.data || []);
      setReviewedTasks(reviewedRes.data || []);
      const metaMap = {};
      (projectsRes.data || []).forEach((p) => {
        metaMap[p._id] = p;
      });
      setProjectMeta(metaMap);
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

  const groupedProjects = [...tasks, ...reviewedTasks].reduce((acc, task) => {
    const projectId = task.projectId?._id || 'unknown';
    if (!acc[projectId]) {
      acc[projectId] = {
        project: task.projectId || { _id: 'unknown', name: 'Unknown Project' },
        annotators: {},
      };
    }
    const annotatorId = task.annotatorId?._id || 'unknown';
    if (!acc[projectId].annotators[annotatorId]) {
      acc[projectId].annotators[annotatorId] = {
        annotator: task.annotatorId || { _id: 'unknown', fullName: 'Unknown' },
        tasks: [],
      };
    }
    acc[projectId].annotators[annotatorId].tasks.push(task);
    return acc;
  }, {});

  const groupedReviewedProjects = reviewedTasks.reduce((acc, task) => {
    const projectId = task.projectId?._id || 'unknown';
    if (!acc[projectId]) {
      acc[projectId] = {
        project: task.projectId || { _id: 'unknown', name: 'Unknown Project' },
        annotators: {},
      };
    }
    const annotatorId = task.annotatorId?._id || 'unknown';
    if (!acc[projectId].annotators[annotatorId]) {
      acc[projectId].annotators[annotatorId] = {
        annotator: task.annotatorId || { _id: 'unknown', fullName: 'Unknown' },
        tasks: [],
      };
    }
    acc[projectId].annotators[annotatorId].tasks.push(task);
    return acc;
  }, {});

  const projectList = Object.values(groupedProjects);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProjectList = projectList
    .map((proj) => {
      const projectName = (proj.project?.name || '').toLowerCase();
      const projectMatched = projectName.includes(normalizedQuery);
      const annotators = Object.values(proj.annotators)
        .filter((ag) => {
          if (!normalizedQuery) return true;
          if (projectMatched) return true;
          const name = (ag.annotator?.fullName || ag.annotator?.username || '').toLowerCase();
          return name.includes(normalizedQuery);
        })
        .reduce((acc, ag) => {
          acc[ag.annotator._id || 'unknown'] = ag;
          return acc;
        }, {});
      const projectType = detectProjectType({ ...proj, annotators });
      return { ...proj, annotators, projectType };
    })
    .filter((proj) => Object.keys(proj.annotators).length > 0)
    .filter((proj) => selectedTypeFilter === 'all' || proj.projectType === selectedTypeFilter);

  const getProjectBucket = (proj) => {
    const pid = proj?.project?._id;
    const meta = projectMeta[pid];
    const decision = meta?.projectReview?.status;
    if (decision === 'approved' || decision === 'rejected') return 'finalized';

    const deadlineRaw = meta?.deadline || proj?.project?.deadline;
    if (deadlineRaw) {
      const deadline = new Date(deadlineRaw);
      if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
        return 'overdue';
      }
    }
    return 'active';
  };

  function detectProjectType(proj) {
    const pid = proj?.project?._id;
    const meta = projectMeta[pid] || {};
    const mimeCandidates = [
      meta?.datasetType,
      meta?.type,
      meta?.dataType,
      meta?.mimeType,
      proj?.project?.datasetType,
      proj?.project?.type,
      proj?.project?.dataType,
      ...Object.values(proj?.annotators || {}).flatMap((ag) =>
        (ag?.tasks || []).map((t) => t?.dataItem?.mimeType || t?.dataItem?.type || '')
      ),
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());

    if (mimeCandidates.some((v) => v.includes('image'))) return 'image';
    if (mimeCandidates.some((v) => v.includes('audio'))) return 'audio';
    if (mimeCandidates.some((v) => v.includes('text') || v.includes('nlp'))) return 'text';
    return 'unknown';
  }

  const getTypeMeta = (type) => {
    switch (type) {
      case 'image':
        return { label: 'IMAGE', color: '#4FC3F7', icon: 'image-outline' };
      case 'text':
        return { label: 'TEXT', color: '#A78BFA', icon: 'document-text-outline' };
      case 'audio':
        return { label: 'AUDIO', color: '#FFB74D', icon: 'musical-notes-outline' };
      default:
        return { label: 'UNKNOWN', color: COLORS.textMuted, icon: 'help-circle-outline' };
    }
  };

  const groupedByBucket = filteredProjectList.reduce((acc, proj) => {
    const bucket = getProjectBucket(proj);
    acc[bucket].push(proj);
    return acc;
  }, { overdue: [], active: [], finalized: [] });

  const sectionedProjectList = [
    {
      key: 'active',
      title: `Còn hạn (${groupedByBucket.active.length})`,
      color: '#00E6A0',
      data: groupedByBucket.active,
    },
    {
      key: 'finalized',
      title: `Đã approve/reject (${groupedByBucket.finalized.length})`,
      color: COLORS.primary,
      data: groupedByBucket.finalized,
    },
    {
      key: 'overdue',
      title: `Quá hạn (${groupedByBucket.overdue.length})`,
      color: COLORS.danger,
      data: groupedByBucket.overdue,
    },
  ];

  const visibleSections = selectedBucketFilter === 'all'
    ? sectionedProjectList
    : sectionedProjectList.filter((section) => section.key === selectedBucketFilter);

  const listData = visibleSections.flatMap((section) => {
    if (section.data.length === 0) return [];
    return [
      { type: 'section', key: `section-${section.key}`, title: section.title, color: section.color },
      ...section.data.map((proj) => ({
        type: 'project',
        key: `project-${proj.project._id}`,
        bucket: section.key,
        item: proj,
      })),
    ];
  });


  const renderAnnotator = (annotatorGroup) => {
    const isOverdue = annotatorGroup.isOverdue;
    const isSelected = annotatorGroup.selectedSet?.has(annotatorGroup.annotator._id);
    const pendingTasks = (annotatorGroup.tasks || []).filter((t) => t.status === 'submitted');
    const reviewCount = pendingTasks.length;
    const reviewedCount = annotatorGroup.reviewedTasks?.length || 0;
    const totalCount = reviewCount + reviewedCount;

    const handleOpenReview = () => {
      if (isOverdue) {
        Alert.alert('Project quá hạn', 'Project đã quá hạn nên không thể mở task để review.');
        return;
      }
      if (reviewCount === 0) return;
      const firstTask = pendingTasks
        .sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt))[0];
      if (!firstTask) return;
      navigation.navigate('ReviewerTask', {
        taskId: firstTask._id,
        mode: 'review',
        annotatorIds: annotatorGroup.annotator._id,
      });
    };

    const handleOpenHistory = () => {
      if (reviewedCount === 0) return;
      const firstTask = annotatorGroup.reviewedTasks
        .sort((a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt) - new Date(a.reviewedAt || a.updatedAt || a.createdAt))[0];
      if (!firstTask) return;
      navigation.navigate('ReviewerTask', {
        taskId: firstTask._id,
        mode: 'history',
        annotatorIds: annotatorGroup.annotator._id,
      });
    };

    return (
      <View key={annotatorGroup.annotator._id} style={styles.annotatorCard}>
        <View style={styles.annotatorRow}>
          <TouchableOpacity
            style={[styles.selectCircle, isSelected && styles.selectCircleOn]}
            onPress={() => annotatorGroup.onToggle?.(annotatorGroup.annotator._id)}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
          </TouchableOpacity>
          <Text style={styles.annotatorName}>{annotatorGroup.annotator.fullName || 'Unknown'}</Text>
          <View style={[styles.statusPill, reviewCount > 0 ? styles.statusPending : styles.statusDone]}>
            <Text style={styles.statusText}>
              {reviewCount > 0 ? 'ĐANG CHỜ REVIEW' : 'ĐÃ REVIEW XONG'}
            </Text>
          </View>
        </View>

        <View style={styles.annotatorStatsRow}>
          <Text style={styles.statItem}>Tổng item: {totalCount}</Text>
          <Text style={styles.statItem}>Chờ review: {reviewCount}</Text>
          <Text style={styles.statItem}>Đã review: {reviewedCount}</Text>
        </View>

        <View style={styles.annotatorActions}>
          <TouchableOpacity
            style={[styles.actionBtn, reviewCount === 0 && styles.actionBtnDisabled]}
            onPress={handleOpenReview}
            disabled={reviewCount === 0}
          >
            <Text style={styles.actionBtnText}>Mở task chờ review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, reviewedCount === 0 && styles.actionBtnDisabled]}
            onPress={handleOpenHistory}
            disabled={reviewedCount === 0}
          >
            <Text style={styles.actionBtnText}>Xem lại review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderProject = (item, bucket) => {
    const isOpen = selectedProjectId === item.project._id;
    const typeMeta = getTypeMeta(item.projectType);
    const annotatorList = Object.values(item.annotators).map((ag) => {
      const reviewedProjectGroup = groupedReviewedProjects[item.project._id];
      const reviewedForAnnotator = reviewedProjectGroup?.annotators?.[ag.annotator._id]?.tasks || [];
      return { ...ag, reviewedTasks: reviewedForAnnotator };
    });
    const selectedSet = selectedAnnotatorIdsByProject[item.project._id] || new Set();
    const selectedIds = Array.from(selectedSet);
    const projectInfo = projectMeta[item.project._id];
    const snapshot = projectInfo?.projectReviewSnapshot;
    const projectDecision = projectInfo?.projectReview?.status;
    const decisionLabel = projectDecision === 'approved'
      ? 'APPROVE'
      : projectDecision === 'rejected'
        ? 'REJECT'
        : 'APPROVE/REJECT';
    const actionableLeft = snapshot?.actionableLeft ?? null;
    const canFinalize = actionableLeft === 0;

    const reviewedForProject = reviewedTasks.filter((t) => {
      const pid = t?.projectId?._id || t?.projectId;
      return pid?.toString?.() === item.project._id?.toString?.();
    });
    const approvedCount = reviewedForProject.filter((t) => t.status === 'approved').length;
    const rejectedCount = reviewedForProject.filter((t) => t.status === 'rejected').length;
    const totalReviewed = reviewedForProject.length;
    const approvedRate = totalReviewed > 0 ? approvedCount / totalReviewed : 0;
    const rejectedRate = totalReviewed > 0 ? rejectedCount / totalReviewed : 0;
    const approveEligible = approvedRate >= PROJECT_APPROVE_THRESHOLD;
    const rejectEligible = rejectedRate >= PROJECT_REJECT_THRESHOLD;
    const recommendStatus = totalReviewed === 0
      ? 'pending'
      : approveEligible
        ? 'approved'
        : rejectEligible
          ? 'rejected'
          : 'review';

    const toggleAnnotator = (annotatorId) => {
      setSelectedAnnotatorIdsByProject((prev) => {
        const next = { ...prev };
        const current = new Set(next[item.project._id] || []);
        if (current.has(annotatorId)) {
          current.delete(annotatorId);
        } else {
          current.add(annotatorId);
        }
        next[item.project._id] = current;
        return next;
      });
    };

    const selectAllAnnotators = () => {
      const allIds = annotatorList.map(a => a.annotator._id).filter(Boolean);
      setSelectedAnnotatorIdsByProject((prev) => ({
        ...prev,
        [item.project._id]: new Set(allIds),
      }));
    };

    const clearAllAnnotators = () => {
      setSelectedAnnotatorIdsByProject((prev) => ({
        ...prev,
        [item.project._id]: new Set(),
      }));
    };

    const openSelectedTasks = () => {
      if (bucket === 'overdue') {
        Alert.alert('Project quá hạn', 'Project đã quá hạn nên không thể mở task để review.');
        return;
      }
      if (selectedIds.length === 0) return;
      const firstTask = annotatorList
        .filter(a => selectedSet.has(a.annotator._id))
        .flatMap(a => a.tasks)
        .sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt))[0];

      if (!firstTask) return;

      navigation.navigate('ReviewerTask', {
        taskId: firstTask._id,
        mode: 'review',
        annotatorIds: selectedIds.join(','),
      });
    };

    const handleProjectDecision = async (status) => {
      if (!projectInfo?._id) return;
      if (!canFinalize) {
        Alert.alert('Not ready', 'Project still has pending/submitted tasks.');
        return;
      }
      if (status === 'approved' && !approveEligible) {
        Alert.alert('Not enough votes', 'Chưa đủ tỷ lệ đồng thuận để duyệt project.');
        return;
      }
      if (status === 'rejected' && !rejectEligible) {
        Alert.alert('Not enough votes', 'Chưa đủ tỷ lệ đồng thuận để từ chối project.');
        return;
      }
      setProjectActionLoading((prev) => ({ ...prev, [projectInfo._id]: status }));
      try {
        await projectsAPI.reviewDecision(projectInfo._id, { status });
        await loadTasks();
        Alert.alert('Success', `Project marked as ${status}.`);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setProjectActionLoading((prev) => ({ ...prev, [projectInfo._id]: null }));
      }
    };

    return (
      <Card style={styles.projectCard}>
        <TouchableOpacity
          style={styles.projectHeader}
          onPress={() => {
            setSelectedProjectId(isOpen ? null : item.project._id);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.projectHeaderLeft}>
            <View style={styles.projectTitleRow}>
              <Text style={styles.projectName} numberOfLines={1}>{item.project.name}</Text>
              <View
                style={[
                  styles.projectStateBadge,
                  bucket === 'active' && styles.projectStateActive,
                  bucket === 'finalized' && styles.projectStateFinalized,
                  bucket === 'overdue' && styles.projectStateOverdue,
                ]}
              >
                <Text
                  style={[
                    styles.projectStateBadgeText,
                    bucket === 'active' && styles.projectStateBadgeTextActive,
                    bucket === 'finalized' && styles.projectStateBadgeTextFinalized,
                    bucket === 'overdue' && styles.projectStateBadgeTextOverdue,
                  ]}
                >
                  {bucket === 'active' ? 'CÒN HẠN' : bucket === 'finalized' ? decisionLabel : 'QUÁ HẠN'}
                </Text>
              </View>
            </View>
            <View style={styles.projectMetaRow}>
              <Text style={styles.projectMeta}>Annotators: {annotatorList.length} • Tasks: {annotatorList.reduce((sum, a) => sum + a.tasks.length, 0)}</Text>
              <View style={[styles.typeBadge, { borderColor: typeMeta.color + '88', backgroundColor: typeMeta.color + '22' }] }>
                <Ionicons name={typeMeta.icon} size={12} color={typeMeta.color} />
                <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
              </View>
            </View>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.projectBody}>
            <View style={styles.projectDecisionBar}>
              <TouchableOpacity
                style={[styles.projectDecisionBtn, styles.projectDecisionApprove, (!canFinalize || !approveEligible) && styles.projectDecisionDisabled]}
                onPress={() => handleProjectDecision('approved')}
                disabled={!canFinalize || !approveEligible || projectActionLoading[item.project._id]}
              >
                <Text style={styles.projectDecisionText}>
                  {projectActionLoading[item.project._id] === 'approved' ? 'Approving...' : 'Approve project'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.projectDecisionBtn, styles.projectDecisionReject, (!canFinalize || !rejectEligible) && styles.projectDecisionDisabled]}
                onPress={() => handleProjectDecision('rejected')}
                disabled={!canFinalize || !rejectEligible || projectActionLoading[item.project._id]}
              >
                <Text style={styles.projectDecisionText}>
                  {projectActionLoading[item.project._id] === 'rejected' ? 'Rejecting...' : 'Reject project'}
                </Text>
              </TouchableOpacity>
              {projectDecision && (
                <View style={styles.projectDecisionStatus}>
                  <Text style={styles.projectDecisionStatusText}>{projectDecision.toUpperCase()}</Text>
                </View>
              )}
            </View>
            {actionableLeft !== null && !canFinalize && (
              <Text style={styles.projectDecisionHint}>
                Còn {actionableLeft} task chưa xong, chưa thể duyệt project.
              </Text>
            )}
            {canFinalize && (
              <Text style={styles.projectDecisionHint}>
                Khuyến nghị: {recommendStatus.toUpperCase()} • Approved {(approvedRate * 100).toFixed(1)}% • Rejected {(rejectedRate * 100).toFixed(1)}%
              </Text>
            )}
            {canFinalize && !approveEligible && (
              <Text style={styles.projectDecisionHint}>
                Chưa đủ tỷ lệ đồng thuận để duyệt project.
              </Text>
            )}
            {canFinalize && !rejectEligible && (
              <Text style={styles.projectDecisionHint}>
                Chưa đủ tỷ lệ đồng thuận để từ chối project.
              </Text>
            )}
            <View style={styles.multiSelectBar}>
              <TouchableOpacity style={styles.multiSelectBtn} onPress={selectAllAnnotators}>
                <Text style={styles.multiSelectText}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.multiSelectBtn} onPress={clearAllAnnotators}>
                <Text style={styles.multiSelectText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.multiSelectBtn, (selectedIds.length === 0 || bucket === 'overdue') && styles.multiSelectBtnDisabled]}
                onPress={openSelectedTasks}
                disabled={selectedIds.length === 0 || bucket === 'overdue'}
              >
                <Text style={styles.multiSelectText}>Open selected ({selectedIds.length})</Text>
              </TouchableOpacity>
            </View>
            {annotatorList.map((group) => renderAnnotator({ ...group, onToggle: toggleAnnotator, selectedSet, isOverdue: bucket === 'overdue' }))}
          </View>
        )}
      </Card>
    );
  };

  const renderListItem = ({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: item.color }]} />
          <Text style={[styles.sectionHeaderText, { color: item.color }]}>{item.title}</Text>
        </View>
      );
    }
    return renderProject(item.item, item.bucket);
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Review Queue</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{tasks.length}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search annotator..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterPanel}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Trạng thái</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipCompact, selectedBucketFilter === 'all' && styles.filterChipSelected]}
              onPress={() => setSelectedBucketFilter('all')}
            >
              <Text style={[styles.filterChipText, selectedBucketFilter === 'all' && styles.filterChipTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.filterChipCompact,
                selectedBucketFilter === 'active' && styles.filterChipSelected,
                selectedBucketFilter === 'active' && styles.filterChipActiveSelected,
              ]}
              onPress={() => setSelectedBucketFilter('active')}
            >
              <Text style={[styles.filterChipText, selectedBucketFilter === 'active' && styles.filterChipTextSuccess]}>Còn hạn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.filterChipCompact,
                selectedBucketFilter === 'finalized' && styles.filterChipSelected,
                selectedBucketFilter === 'finalized' && styles.filterChipFinalizedSelected,
              ]}
              onPress={() => setSelectedBucketFilter('finalized')}
            >
              <Text style={[styles.filterChipText, selectedBucketFilter === 'finalized' && styles.filterChipTextFinalized]}>Đã duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.filterChipCompact,
                selectedBucketFilter === 'overdue' && styles.filterChipSelected,
                selectedBucketFilter === 'overdue' && styles.filterChipOverdueSelected,
              ]}
              onPress={() => setSelectedBucketFilter('overdue')}
            >
              <Text style={[styles.filterChipText, selectedBucketFilter === 'overdue' && styles.filterChipTextOverdue]}>Quá hạn</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Loại dữ liệu</Text>
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: COLORS.textSecondary },
              { key: 'image', label: 'Image', icon: 'image-outline', color: '#4FC3F7' },
              { key: 'text', label: 'Text', icon: 'document-text-outline', color: '#A78BFA' },
              { key: 'audio', label: 'Audio', icon: 'musical-notes-outline', color: '#FFB74D' },
            ].map((f) => {
              const active = selectedTypeFilter === f.key;
              const iconColor = active ? f.color : (f.key === 'all' ? COLORS.textSecondary : `${f.color}99`);
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    styles.filterChipCompact,
                    active && styles.filterChipSelected,
                    active && f.key !== 'all' && { borderColor: `${f.color}CC`, backgroundColor: `${f.color}22` },
                  ]}
                  onPress={() => setSelectedTypeFilter(f.key)}
                >
                  <Ionicons name={f.icon} size={12} color={iconColor} />
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                      f.key !== 'all' && { color: active ? f.color : `${f.color}CC` },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <FlatList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={item => item.key}
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  filterPanel: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipSelected: {
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.bgElevated,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  filterChipTextActive: { color: COLORS.textPrimary },
  filterChipActiveSelected: { borderColor: '#00C389', backgroundColor: 'rgba(0,195,137,0.16)' },
  filterChipFinalizedSelected: { borderColor: COLORS.primary + 'AA', backgroundColor: COLORS.primary + '22' },
  filterChipOverdueSelected: { borderColor: COLORS.danger + 'AA', backgroundColor: COLORS.danger + '22' },
  filterChipTextSuccess: { color: '#00E6A0' },
  filterChipTextFinalized: { color: '#7EB0FF' },
  filterChipTextOverdue: { color: '#FF6B77' },
  sectionHeader: {
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  projectCard: { marginBottom: SPACING.md, padding: 0 },
  projectHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  projectHeaderLeft: { flex: 1, marginRight: SPACING.md },
  projectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 3 },
  projectName: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  projectStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  projectStateActive: { backgroundColor: COLORS.success + '22', borderColor: COLORS.success + '88' },
  projectStateFinalized: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary + '88' },
  projectStateOverdue: { backgroundColor: COLORS.danger + '22', borderColor: COLORS.danger + '88' },
  projectStateBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  projectStateBadgeTextActive: { color: '#00E6A0' },
  projectStateBadgeTextFinalized: { color: '#7EB0FF' },
  projectStateBadgeTextOverdue: { color: '#FF6B77' },
  projectMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  projectMeta: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  projectBody: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  annotatorCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  annotatorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  annotatorStatsRow: { marginTop: SPACING.sm, gap: 6 },
  annotatorActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  statusPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusPending: { backgroundColor: COLORS.warning, borderWidth: 1, borderColor: COLORS.warning + '88' },
  statusDone: { backgroundColor: COLORS.success, borderWidth: 1, borderColor: COLORS.success + '88' },
  statusText: { fontSize: 10, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  statItem: { fontSize: 11, color: COLORS.textMuted },
  annotatorName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  projectDecisionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  projectDecisionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  projectDecisionApprove: { backgroundColor: COLORS.success },
  projectDecisionReject: { backgroundColor: COLORS.danger },
  projectDecisionDisabled: { opacity: 0.5 },
  projectDecisionText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  projectDecisionStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  projectDecisionStatusText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  projectDecisionHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: SPACING.sm },
  multiSelectBar: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  multiSelectBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  multiSelectBtnDisabled: { opacity: 0.5 },
  multiSelectText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  selectCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  selectCircleOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
});
