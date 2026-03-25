import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI } from '../../services/api';
import { BASE_URL } from '../../services/api';
import { Screen, Header, Card, StatusBadge, Button, Tag, SectionTitle, Loading, InfoRow } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function AnnotatorTaskDetailScreen({ navigation, route }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTask = async () => {
    try {
      const res = await tasksAPI.getById(taskId);
      setTask(res.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadTask(); }, [taskId]);

  const handleSubmit = async () => {
    Alert.alert('Submit Task', 'Submit this task for review? You won\'t be able to edit it until reviewed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          setSubmitting(true);
          try {
            await tasksAPI.submit(taskId);
            loadTask();
            Alert.alert('Submitted!', 'Your task has been submitted for review.');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  if (loading) return <Screen><Header title="Task Detail" onBack={() => navigation.goBack()} /><Loading /></Screen>;
  if (!task) return <Screen><Header title="Not Found" onBack={() => navigation.goBack()} /></Screen>;

  const canLabel = ['assigned', 'in_progress', 'rejected'].includes(task.status);
  const canSubmit = task.status === 'in_progress' && task.labels && Object.keys(task.labels).length > 0;
  const imageUrl = task.dataItem?.path ? `${BASE_URL}/${task.dataItem.path}` : null;

  return (
    <Screen>
      <Header
        title="Task Detail"
        subtitle={task.projectId?.name}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTask(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View style={styles.statusRow}>
          <StatusBadge status={task.status} />
          {task.reviewedAt && (
            <Text style={styles.reviewedAt}>
              Reviewed {new Date(task.reviewedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Rejection Feedback */}
        {task.status === 'rejected' && (
          <Card style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
              <Text style={styles.rejectionTitle}>Task Rejected</Text>
            </View>
            {task.errorCategory && (
              <View style={styles.errorTag}>
                <Text style={styles.errorTagText}>{task.errorCategory.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.rejectionComment}>{task.reviewComments}</Text>
            {task.reviewNotes?.length > 0 && (
              <Text style={styles.reviewNotesHint}>
                💬 {task.reviewNotes.length} feedback note(s) on image — tap "Revise" to view
              </Text>
            )}
          </Card>
        )}

        {/* Image Preview */}
        {imageUrl && (
          <>
            <SectionTitle title="Image" />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </Card>
          </>
        )}

        {/* Task Info */}
        <SectionTitle title="Task Info" />
        <Card>
          <InfoRow icon="folder-outline" label="Project" value={task.projectId?.name} />
          <InfoRow icon="server-outline" label="Dataset" value={task.datasetId?.name} />
          <InfoRow icon="document-outline" label="File" value={task.dataItem?.filename} />
          <InfoRow icon="calendar-outline" label="Assigned" value={new Date(task.createdAt).toLocaleDateString()} />
          {task.submittedAt && (
            <InfoRow icon="paper-plane-outline" label="Submitted" value={new Date(task.submittedAt).toLocaleDateString()} />
          )}
          {task.reviewerId && (
            <InfoRow
              icon="eye-outline"
              label="Reviewer"
              value={task.reviewerId?.fullName || task.reviewerId?.username}
            />
          )}
        </Card>

        {/* Labels */}
        {task.labels && Object.keys(task.labels).length > 0 && (
          <>
            <SectionTitle title="Labels" />
            <Card>
              {task.labels.objects?.length > 0 ? (
                <View>
                  <Text style={styles.labelCount}>{task.labels.objects.length} annotation(s)</Text>
                  <View style={styles.labelsRow}>
                    {[...new Set(task.labels.objects.map(o => o.label))].map(l => {
                      const labelDef = task.projectId?.labelSet?.find(ls => ls.name === l);
                      return <Tag key={l} label={l} color={labelDef?.color} />;
                    })}
                  </View>
                </View>
              ) : (
                <Text style={styles.noLabel}>No annotations yet</Text>
              )}
            </Card>
          </>
        )}

        {/* Project Guidelines */}
        {task.projectId?.guidelines && (
          <>
            <SectionTitle title="Guidelines" />
            <Card>
              <Text style={styles.guidelines}>{task.projectId.guidelines}</Text>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionArea}>
          {canLabel && (
            <Button
              title={task.status === 'rejected' ? 'Revise Labels' : 'Start Labeling'}
              onPress={() => navigation.navigate('AnnotatorLabeling', { taskId: task._id })}
              variant="primary"
              icon="pencil-outline"
              size="lg"
            />
          )}
          {canSubmit && (
            <Button
              title="Submit for Review"
              onPress={handleSubmit}
              loading={submitting}
              variant="success"
              icon="paper-plane-outline"
              size="lg"
              style={{ marginTop: SPACING.sm }}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 100 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.lg,
  },
  reviewedAt: { fontSize: 12, color: COLORS.textMuted },
  rejectionCard: {
    backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger + '44',
    marginBottom: SPACING.lg,
  },
  rejectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rejectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  errorTag: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: COLORS.danger + '33', borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  errorTagText: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
  rejectionComment: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  reviewNotesHint: { fontSize: 12, color: COLORS.warning, marginTop: SPACING.sm, fontStyle: 'italic' },
  previewImage: { width: '100%', height: 250, backgroundColor: COLORS.bgElevated },
  labelCount: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  noLabel: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.md },
  guidelines: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  actionArea: { marginTop: SPACING.lg },
});
