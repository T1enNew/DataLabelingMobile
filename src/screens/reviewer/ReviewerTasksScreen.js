/**
 * ReviewerTasksScreen
 * Workflow: Compare many -> Select one -> Approve/Reject one
 * KHONG co nut "Set Primary"
 *
 * Params from SubtopicScreen:
 *   itemId, dataItem, submissions, projectId, subtopicId, subtopicName, mode
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity,
  TextInput, Image, Modal, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reviewsAPI, BASE_URL } from '../../services/api';
import { Screen, Card, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const SCREEN_W = Dimensions.get('window').width;

function buildFileUrl(dataItem) {
  if (!dataItem) return '';
  const base = BASE_URL.replace(/\/+$/, '');
  const rawPath = dataItem.path || '';
  const cleanPath = rawPath.replace(/^\/+/, '');
  if (cleanPath) {
    if (dataItem.filename && cleanPath.endsWith(dataItem.filename)) return `${base}/${cleanPath}`;
    return dataItem.filename ? `${base}/${cleanPath}/${dataItem.filename}` : `${base}/${cleanPath}`;
  }
  return dataItem.filename ? `${base}/uploads/datasets/${dataItem.filename}` : '';
}

function getDatasetType(dataItem) {
  const mime = dataItem?.mimeType || '';
  const fn = dataItem?.filename || '';
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fn)) return 'image';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fn)) return 'audio';
  if (mime.startsWith('text/') || /\.(txt|csv|json)$/i.test(fn)) return 'text';
  return 'image';
}

const ANN_STATUS = {
  pending:   { color: COLORS.warning, label: 'Pending',   icon: 'time-outline' },
  approved:  { color: COLORS.accent,   label: 'Approved',  icon: 'checkmark-circle-outline' },
  rejected:  { color: COLORS.danger,   label: 'Rejected',  icon: 'close-circle-outline' },
};

function AnnotatorChip({ submission, isActive, isVisible, onToggle, onSelect }) {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.chipActive, !isVisible && styles.chipDimmed]}
      onPress={onSelect}
    >
      <View style={[styles.chipDot, { backgroundColor: submission.color }]} />
      <Text style={[styles.chipName, isActive && styles.chipNameActive]} numberOfLines={1}>
        {submission.annotatorName}
      </Text>
      <TouchableOpacity onPress={() => onToggle(submission.annotatorId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name={isVisible ? 'eye' : 'eye-off'} size={14} color={isVisible ? COLORS.primary : COLORS.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ReviewerTasksScreen({ navigation, route }) {
  const {
    itemId, dataItem, submissions, projectId, subtopicId, subtopicName, mode
  } = route.params || {};

  const isReadOnly = mode === 'history';
  const imageUrl = buildFileUrl(dataItem);
  const datasetType = getDatasetType(dataItem);

  // Local state mirrors web Task.jsx approach — update immediately after approve/reject
  const [localSubmissions, setLocalSubmissions] = useState(submissions || []);
  const [compareVisible, setCompareVisible] = useState(() => {
    const init = {};
    (submissions || []).forEach(s => { init[s.annotatorId] = true; });
    return init;
  });

  const [activeAnnotatorId, setActiveAnnotatorId] = useState(() => {
    const first = (submissions || []).find(s => s.status === 'pending');
    return first?.annotatorId || submissions?.[0]?.annotatorId || '';
  });

  const [feedback, setFeedback] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imgMeta, setImgMeta] = useState({ width: SCREEN_W - SPACING.lg * 2, height: 260 });

  const pendingSubmissions = localSubmissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = localSubmissions.filter(s => s.status !== 'pending');
  const activeSubmission = localSubmissions.find(s => s.annotatorId === activeAnnotatorId) || localSubmissions[0];
  const canScore = !isReadOnly && activeSubmission?.status === 'pending';

  // Update local state immediately after approve/reject — mirrors web doUpdateItem
  const doUpdateItem = useCallback((updatedSub, newStatus, newFeedback) => {
    setLocalSubmissions(prev => prev.map(s =>
      s.submissionId === updatedSub.submissionId
        ? { ...s, status: newStatus, feedback: newFeedback }
        : s
    ));
    // Auto-select next pending annotator if current one just got reviewed
    if (updatedSub.annotatorId === activeAnnotatorId && newStatus !== 'pending') {
      const nextPending = localSubmissions.find(s => s.status === 'pending' && s.annotatorId !== updatedSub.annotatorId);
      if (nextPending) {
        setActiveAnnotatorId(nextPending.annotatorId);
        setCompareVisible({ [nextPending.annotatorId]: true });
      }
    }
  }, [activeAnnotatorId, localSubmissions]);

  const toggleCompare = useCallback((aid) => {
    setCompareVisible(prev => ({ ...prev, [aid]: !prev[aid] }));
  }, []);

  const labelSummary = useMemo(() => {
    const counts = {};
    localSubmissions.forEach(sub => {
      if (!compareVisible[sub.annotatorId]) return;
      const labels = sub.labels || {};
      // New format: labels.objects = [{ label, bbox, ... }]
      if (Array.isArray(labels.objects)) {
        labels.objects.forEach(obj => {
          const name = obj.label || 'Unknown';
          if (!counts[name]) counts[name] = { label: name, count: 0, color: sub.color };
          counts[name].count++;
        });
      }
      // Legacy format: labels.bboxes = [{ label, x, y, width, height }]
      else if (Array.isArray(labels.bboxes)) {
        labels.bboxes.forEach(obj => {
          const name = obj.label || 'Unknown';
          if (!counts[name]) counts[name] = { label: name, count: 0, color: sub.color };
          counts[name].count++;
        });
      }
    });
    return Object.values(counts);
  }, [compareVisible, localSubmissions]);

  useEffect(() => {
    if (pendingSubmissions.length > 0 && !pendingSubmissions.find(s => s.annotatorId === activeAnnotatorId)) {
      setActiveAnnotatorId(pendingSubmissions[0].annotatorId);
    }
  }, [localSubmissions]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('ReviewerSubtopic', { projectId, subtopicId, subtopicName });
  }, [navigation, projectId, subtopicId, subtopicName]);

  const handleApprove = useCallback(async () => {
    if (!canScore || !activeSubmission) {
      Alert.alert('Khong the duyet', 'Task nay khong o trang thai pending.');
      return;
    }
    Alert.alert('Approve Task', 'Duyet task cua ' + activeSubmission.annotatorName + '?', [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setSubmitting(true);
          try {
            await reviewsAPI.approve(activeSubmission.submissionId, { reviewNotes: [] });
            doUpdateItem(activeSubmission, 'approved', '');
            setFeedback('');
            // Auto-navigate back if all annotators are now reviewed
            const remaining = localSubmissions.filter(s => s.submissionId !== activeSubmission.submissionId && s.status === 'pending');
            if (remaining.length === 0) {
              Alert.alert('Hoan thanh', 'Tat ca annotator da duoc review.', [{ text: 'OK', onPress: goBack }]);
            }
          } catch (e) {
            Alert.alert('Loi', e.message);
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  }, [canScore, activeSubmission, doUpdateItem, goBack]);

  const handleReject = useCallback(async () => {
    if (!canScore || !activeSubmission) {
      Alert.alert('Khong the tu choi', 'Task nay khong o trang thai pending.');
      return;
    }
    if (!rejectComment.trim()) {
      Alert.alert('Thieu thong tin', 'Vui long nhap ly do tu choi.');
      return;
    }
    setSubmitting(true);
    setShowRejectModal(false);
    try {
      await reviewsAPI.reject(activeSubmission.submissionId, { reviewComments: rejectComment.trim(), reviewNotes: [] });
      doUpdateItem(activeSubmission, 'rejected', rejectComment.trim());
      setRejectComment('');
      setFeedback('');
      // Auto-navigate back if all annotators are now reviewed
      const remaining = localSubmissions.filter(s => s.submissionId !== activeSubmission.submissionId && s.status === 'pending');
      if (remaining.length === 0) {
        Alert.alert('Hoan thanh', 'Tat ca annotator da duoc review.', [{ text: 'OK', onPress: goBack }]);
      }
    } catch (e) {
      Alert.alert('Loi', e.message);
    } finally {
      setSubmitting(false);
    }
  }, [canScore, activeSubmission, rejectComment, doUpdateItem, goBack]);

  const handleImageLoad = useCallback((e) => {
    const w = e.nativeEvent.source.width;
    const h = e.nativeEvent.source.height;
    if (w && h) {
      setImgMeta({ width: SCREEN_W - SPACING.lg * 2, height: Math.min((SCREEN_W - SPACING.lg * 2) * h / w, 400) });
    }
  }, []);

  if (!submissions || submissions.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{subtopicName || 'Review Task'}</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Khong co submission nao</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{dataItem?.filename || 'Task'}</Text>
          <View style={styles.headerStats}>
            <Text style={[styles.headerBadge, { color: COLORS.warning }]}>
              {pendingSubmissions.length} pending
            </Text>
            <Text style={[styles.headerBadge, { color: COLORS.accent }]}>
              {reviewedSubmissions.length} reviewed
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>COMPARE ({localSubmissions.length} annotators)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {localSubmissions.map(sub => (
              <AnnotatorChip
                key={sub.annotatorId}
                submission={sub}
                isActive={sub.annotatorId === activeAnnotatorId}
                isVisible={compareVisible[sub.annotatorId]}
                onToggle={toggleCompare}
                onSelect={() => setActiveAnnotatorId(sub.annotatorId)}
              />
            ))}
          </View>
        </ScrollView>

        {datasetType === 'image' && imageUrl ? (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>DATA</Text>
            <View style={[styles.imageContainer, { height: imgMeta.height }]}>
              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: imgMeta.height }} resizeMode="contain" onLoad={handleImageLoad} />
              {localSubmissions
                .filter(s => compareVisible[s.annotatorId] && s.labels && s.labels.objects)
                .map(sub => (
                  <React.Fragment key={sub.annotatorId}>
                    {sub.labels.objects.map((obj, i) => {
                      const raw = obj.bbox;
                      if (!raw || raw.length < 4) return null;
                      const [x1, y1, x2, y2] = raw;
                      const px = (x1 / 100) * imgMeta.width;
                      const py = (y1 / 100) * imgMeta.height;
                      const pw = ((x2 - x1) / 100) * imgMeta.width;
                      const ph = ((y2 - y1) / 100) * imgMeta.height;
                      const tagText = (obj.label || 'Object') + ' — ' + (sub.annotatorName || 'Annotator');
                      const tagW = Math.min(Math.max(tagText.length * 6.5, 60), 200);
                      return (
                        <View key={sub.annotatorId + '-' + i} style={[styles.bboxWrap, { left: px, top: py, width: pw, height: ph }]}>
                          <View style={[styles.bboxBox, { borderColor: sub.color }]} />
                          <View style={[styles.bboxTag, { width: tagW, backgroundColor: sub.color }]}>
                            <Text style={styles.bboxTagText} numberOfLines={1}>{tagText}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </React.Fragment>
                ))}
            </View>
          </View>
        ) : null}

        {datasetType === 'text' && dataItem?.text ? (
          <View style={styles.textSection}>
            <Text style={styles.sectionLabel}>TEXT</Text>
            <Card><Text style={styles.textBody}>{dataItem.text}</Text></Card>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>SUMMARY ({labelSummary.length})</Text>
        {labelSummary.length === 0 ? (
          <Card><Text style={styles.noData}>No annotations from visible annotators</Text></Card>
        ) : (
          <Card>
            {labelSummary.map(s => (
              <View key={s.label} style={styles.summaryRow}>
                <View style={[styles.summaryDot, { backgroundColor: s.color }]} />
                <Text style={styles.summaryLabel}>{s.label}</Text>
                <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
              </View>
            ))}
          </Card>
        )}

        <Text style={styles.sectionLabel}>REVIEWING</Text>
        {localSubmissions.map(sub => {
          const annStatus = ANN_STATUS[sub.status] || ANN_STATUS.pending;
          return (
            <TouchableOpacity
              key={sub.annotatorId}
              style={[styles.annotatorCard, sub.annotatorId === activeAnnotatorId && styles.annotatorCardActive, sub.status !== 'pending' && styles.annotatorCardReviewed]}
              onPress={() => setActiveAnnotatorId(sub.annotatorId)}
              disabled={isReadOnly}
            >
              <View style={[styles.annDot, { backgroundColor: sub.color }]} />
              <View style={styles.annInfo}>
                <Text style={styles.annName}>{sub.annotatorName}</Text>
                <View style={[styles.annBadge, { borderColor: annStatus.color + '66', backgroundColor: annStatus.color + '22' }]}>
                  <Text style={[styles.annBadgeText, { color: annStatus.color }]}>{annStatus.label}</Text>
                </View>
              </View>
              {sub.annotatorId === activeAnnotatorId && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionLabel}>FEEDBACK (optional)</Text>
        <TextInput style={styles.feedbackInput} placeholder="Add feedback note (optional)..." placeholderTextColor={COLORS.textMuted} value={feedback} onChangeText={setFeedback} multiline numberOfLines={3} textAlignVertical="top" />

        <Modal visible={showRejectModal} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ly do tu choi</Text>
              <TextInput style={styles.modalInput} placeholder="Nhap ly do..." placeholderTextColor={COLORS.textMuted} value={rejectComment} onChangeText={setRejectComment} multiline numberOfLines={4} textAlignVertical="top" />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowRejectModal(false)}>
                  <Text style={styles.cancelBtnText}>Huy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.confirmRejectBtn]} onPress={handleReject}>
                  <Text style={styles.confirmRejectText}>Tu choi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>

      {!isReadOnly && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, (!canScore || submitting) && styles.actionBtnDisabled]} onPress={handleApprove} disabled={!canScore || submitting}>
            <Ionicons name="checkmark-circle" size={20} color={canScore ? COLORS.accent : COLORS.textMuted} />
            <Text style={[styles.actionBtnText, { color: canScore ? COLORS.accent : COLORS.textMuted }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn, (!canScore || submitting) && styles.actionBtnDisabled]} onPress={() => setShowRejectModal(true)} disabled={!canScore || submitting}>
            <Ionicons name="close-circle" size={20} color={canScore ? COLORS.danger : COLORS.textMuted} />
            <Text style={[styles.actionBtnText, { color: canScore ? COLORS.danger : COLORS.textMuted }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  headerStats: { flexDirection: 'row', gap: SPACING.sm, marginTop: 2 },
  headerBadge: { fontSize: 11, fontWeight: '600' },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  chipScroll: { marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard, minWidth: 120 },
  chipActive: { borderColor: COLORS.primary + '88', backgroundColor: COLORS.primary + '22' },
  chipDimmed: { opacity: 0.5 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipName: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 1 },
  chipNameActive: { color: COLORS.primary, fontWeight: '700' },
  imageSection: { marginTop: SPACING.sm },
  imageContainer: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  bboxOverlay: { position: 'absolute', borderWidth: 2, borderRadius: 2, opacity: 0.6 },
  bboxWrap: { position: 'absolute', overflow: 'visible' },
  bboxBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderRadius: 2 },
  bboxTag: { position: 'absolute', top: '100%', left: 0, marginTop: 2, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },
  bboxTagText: { fontSize: 9, fontWeight: '700', color: '#fff', textAlign: 'left' },
  textSection: { marginTop: SPACING.sm },
  textBody: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  summaryDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  summaryLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  summaryCount: { fontSize: 13, fontWeight: '700' },
  noData: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center' },
  annotatorCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  annotatorCardActive: { borderColor: COLORS.primary + '66', backgroundColor: COLORS.primary + '11' },
  annotatorCardReviewed: { opacity: 0.7 },
  annDot: { width: 12, height: 12, borderRadius: 6 },
  annInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  annName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  annBadge: { paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1 },
  annBadgeText: { fontSize: 10, fontWeight: '600' },
  feedbackInput: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 14, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  modalInput: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 14, color: COLORS.textPrimary, minHeight: 100, textAlignVertical: 'top', marginBottom: SPACING.md },
  modalBtns: { flexDirection: 'row', gap: SPACING.md },
  modalBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.sm, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmRejectBtn: { backgroundColor: COLORS.danger },
  confirmRejectText: { color: COLORS.white, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: SPACING.md, padding: SPACING.lg, backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  actionBtnDisabled: { opacity: 0.5 },
  approveBtn: { borderColor: COLORS.accent + '66', backgroundColor: COLORS.accent + '11' },
  rejectBtn: { borderColor: COLORS.danger + '66', backgroundColor: COLORS.danger + '11' },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: SPACING.md },
});
