import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity,
  TextInput, Image, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Circle } from 'react-native-svg';
import { tasksAPI, reviewsAPI, BASE_URL } from '../../services/api';
import { Screen, Header, Card, Button, Tag, Loading, StatusBadge, InfoRow } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const ERROR_CATEGORIES = [
  { value: 'incorrect_label', label: 'Incorrect Label' },
  { value: 'missing_label', label: 'Missing Label' },
  { value: 'poor_quality', label: 'Poor Quality' },
  { value: 'does_not_follow_guidelines', label: 'Does Not Follow Guidelines' },
  { value: 'other', label: 'Other' },
];

export default function ReviewerTaskScreen({ navigation, route }) {
  const { taskId, mode } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [errorCategory, setErrorCategory] = useState('other');
  const [reviewNotes, setReviewNotes] = useState([]);
  const [addingNote, setAddingNote] = useState(null); // { x, y }
  const [noteText, setNoteText] = useState('');
  const [imgSize, setImgSize] = useState({ width: 300, height: 250 });

  useEffect(() => {
    tasksAPI.getById(taskId).then(res => {
      setTask(res.data);
    }).catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const imageUrl = task?.dataItem?.path ? `${BASE_URL}/${task.dataItem.path}` : null;
  const annotations = task?.labels?.objects || [];
  const labels = task?.projectId?.labelSet || [];

  const handleApprove = async () => {
    Alert.alert('Approve Task', 'Mark this task as approved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setApproving(true);
          try {
            await reviewsAPI.approve(taskId, { reviewNotes });
            Alert.alert('Approved!', 'Task has been approved.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setApproving(false);
          }
        }
      }
    ]);
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }
    if (reviewNotes.length === 0) {
      Alert.alert('Required', 'Please add at least one feedback note on the image.');
      return;
    }
    setRejecting(true);
    try {
      await reviewsAPI.reject(taskId, {
        reviewComments: rejectComment.trim(),
        errorCategory,
        reviewNotes,
      });
      setShowRejectModal(false);
      Alert.alert('Rejected', 'Task has been rejected with feedback.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleImageTap = (evt) => {
    if (mode !== 'review') return;
    const { locationX, locationY } = evt.nativeEvent;
    setAddingNote({ x: locationX, y: locationY });
    setNoteText('');
  };

  const addNote = () => {
    if (!noteText.trim() || !addingNote) return;
    setReviewNotes(prev => [...prev, {
      bbox: [addingNote.x - 15, addingNote.y - 15, 30, 30],
      comment: noteText.trim(),
      label: null,
    }]);
    setAddingNote(null);
    setNoteText('');
  };

  const removeNote = (idx) => setReviewNotes(prev => prev.filter((_, i) => i !== idx));

  if (loading) return <Screen><Header title="Review Task" onBack={() => navigation.goBack()} /><Loading /></Screen>;
  if (!task) return <Screen><Header title="Not Found" onBack={() => navigation.goBack()} /></Screen>;

  const isReadOnly = mode === 'history' || !['submitted'].includes(task.status);

  return (
    <Screen>
      <Header
        title={isReadOnly ? 'Task Details' : 'Review Task'}
        subtitle={task.projectId?.name}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status */}
        <View style={styles.statusRow}>
          <StatusBadge status={task.status} />
          <Text style={styles.annotatorInfo}>
            By: {task.annotatorId?.fullName || 'Unknown'}
          </Text>
        </View>

        {/* Image with Annotations */}
        {imageUrl && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>
              IMAGE {!isReadOnly ? '(tap to add feedback note)' : ''}
            </Text>
            <View
              style={[styles.imageContainer, { height: imgSize.height }]}
              onStartShouldSetResponder={() => !isReadOnly}
              onResponderRelease={handleImageTap}
            >
              <TouchableOpacity activeOpacity={1} onPress={handleImageTap} disabled={isReadOnly}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: imgSize.height }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    const ratio = height / width;
                    const w = imgSize.width;
                    setImgSize({ width: w, height: Math.min(w * ratio, 300) });
                  }}
                />
              </TouchableOpacity>
              <Svg style={StyleSheet.absoluteFill} width="100%" height={imgSize.height}>
                {/* Annotator bboxes */}
                {annotations.map((ann, i) => {
                  const labelDef = labels.find(l => l.name === ann.label);
                  const color = labelDef?.color || COLORS.primary;
                  const [x, y, w, h] = ann.bbox || [0, 0, 0, 0];
                  return (
                    <React.Fragment key={i}>
                      <Rect x={x} y={y} width={w} height={h} stroke={color} strokeWidth={2} fill={color + '22'} />
                      <SvgText x={x + 4} y={y + 16} fontSize="11" fill={color} fontWeight="bold">{ann.label}</SvgText>
                    </React.Fragment>
                  );
                })}
                {/* Reviewer notes */}
                {reviewNotes.map((note, i) => (
                  <Circle key={i} cx={note.bbox[0] + 15} cy={note.bbox[1] + 15} r={14} fill={COLORS.danger + 'AA'} stroke={COLORS.danger} strokeWidth={2} />
                ))}
                {/* Adding note indicator */}
                {addingNote && (
                  <Circle cx={addingNote.x} cy={addingNote.y} r={14} fill={COLORS.warning + '88'} stroke={COLORS.warning} strokeWidth={2} />
                )}
              </Svg>
            </View>

            {/* Add Note Input */}
            {addingNote && (
              <View style={styles.addNoteBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Feedback note..."
                  placeholderTextColor={COLORS.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                  multiline
                />
                <View style={styles.noteActions}>
                  <Button title="Cancel" onPress={() => setAddingNote(null)} variant="ghost" size="sm" />
                  <Button title="Add Note" onPress={addNote} size="sm" />
                </View>
              </View>
            )}

            {/* Review Notes list */}
            {reviewNotes.length > 0 && (
              <View style={styles.notesList}>
                {reviewNotes.map((note, i) => (
                  <View key={i} style={styles.noteItem}>
                    <View style={styles.noteNum}>
                      <Text style={styles.noteNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.noteText} numberOfLines={2}>{note.comment}</Text>
                    {!isReadOnly && (
                      <TouchableOpacity onPress={() => removeNote(i)}>
                        <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Annotations Summary */}
        <Text style={styles.sectionLabel}>ANNOTATIONS ({annotations.length})</Text>
        {annotations.length === 0 ? (
          <Card><Text style={styles.noData}>No annotations</Text></Card>
        ) : (
          <Card>
            <View style={styles.labelsWrap}>
              {[...new Set(annotations.map(a => a.label))].map(label => {
                const ld = labels.find(l => l.name === label);
                const count = annotations.filter(a => a.label === label).length;
                return (
                  <View key={label} style={styles.labelCountItem}>
                    <Tag label={label} color={ld?.color} />
                    <Text style={styles.labelCountNum}>×{count}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Task Info */}
        <Text style={styles.sectionLabel}>TASK INFO</Text>
        <Card>
          <InfoRow icon="person-outline" label="Annotator" value={task.annotatorId?.fullName} />
          <InfoRow icon="paper-plane-outline" label="Submitted" value={task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'} />
          {task.reviewComments && (
            <InfoRow icon="chatbubble-outline" label="Review Note" value={task.reviewComments} />
          )}
        </Card>

        {/* Guidelines */}
        {task.projectId?.guidelines && (
          <>
            <Text style={styles.sectionLabel}>GUIDELINES</Text>
            <Card><Text style={styles.guidelines}>{task.projectId.guidelines}</Text></Card>
          </>
        )}

        {/* Action Buttons */}
        {!isReadOnly && (
          <View style={styles.actionArea}>
            <Button
              title="Approve"
              onPress={handleApprove}
              loading={approving}
              variant="success"
              icon="checkmark-circle-outline"
              size="lg"
              style={{ flex: 1 }}
            />
            <Button
              title="Reject"
              onPress={() => setShowRejectModal(true)}
              variant="danger"
              icon="close-circle-outline"
              size="lg"
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Task</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>ERROR CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {ERROR_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.categoryBtn, errorCategory === c.value && styles.categoryBtnActive]}
                  onPress={() => setErrorCategory(c.value)}
                >
                  <Text style={[styles.categoryText, errorCategory === c.value && { color: COLORS.danger }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>REASON *</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Explain why this task is being rejected..."
              placeholderTextColor={COLORS.textMuted}
              value={rejectComment}
              onChangeText={setRejectComment}
              multiline
              numberOfLines={4}
            />

            {reviewNotes.length === 0 && (
              <View style={styles.noteWarning}>
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.noteWarningText}>
                  Add at least one feedback note on the image before rejecting.
                </Text>
              </View>
            )}

            <Button
              title={`Reject with ${reviewNotes.length} note(s)`}
              onPress={handleReject}
              loading={rejecting}
              variant="danger"
              icon="close-circle-outline"
              disabled={reviewNotes.length === 0}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 100 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  annotatorInfo: { fontSize: 13, color: COLORS.textSecondary },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  imageSection: { marginBottom: SPACING.md },
  imageContainer: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  addNoteBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '55', marginTop: SPACING.sm,
  },
  noteInput: {
    color: COLORS.textPrimary, fontSize: 14, minHeight: 60,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
  notesList: { marginTop: SPACING.sm, gap: SPACING.xs },
  noteItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.dangerGlow, padding: SPACING.sm, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.danger + '33',
  },
  noteNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  noteNumText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textPrimary },
  labelsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  labelCountItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelCountNum: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  noData: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },
  guidelines: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  actionArea: {
    flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl,
  },
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
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.lg },
  categoryBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  categoryBtnActive: { backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger },
  categoryText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  rejectInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 100,
    textAlignVertical: 'top', marginBottom: SPACING.lg,
  },
  noteWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warningGlow, padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.warning + '44', marginBottom: SPACING.md,
  },
  noteWarningText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 18 },
});
