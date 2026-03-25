import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  ScrollView, PanResponder, Image, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { tasksAPI, BASE_URL } from '../../services/api';
import { Screen, Header, Button, Card, Tag } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const SCREEN_W = Dimensions.get('window').width - SPACING.lg * 2;

export default function AnnotatorLabelingScreen({ navigation, route }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [imgSize, setImgSize] = useState({ width: SCREEN_W, height: 250 });
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  useEffect(() => {
    tasksAPI.getById(taskId).then(res => {
      setTask(res.data);
      // Load existing annotations
      const existing = res.data.labels?.objects || [];
      setAnnotations(existing);
      if (res.data.projectId?.labelSet?.length > 0) {
        setSelectedLabel(res.data.projectId.labelSet[0].name);
      }
    }).catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const getImageUrl = () => {
    if (!task?.dataItem?.path) return null;
    return `${BASE_URL}/${task.dataItem.path}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setDrawing({ startX: locationX, startY: locationY, endX: locationX, endY: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setDrawing(prev => prev ? { ...prev, endX: locationX, endY: locationY } : null);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        setDrawing(prev => {
          if (!prev) return null;
          const x = Math.min(prev.startX, locationX);
          const y = Math.min(prev.startY, locationY);
          const w = Math.abs(locationX - prev.startX);
          const h = Math.abs(locationY - prev.startY);
          if (w > 10 && h > 10) {
            setAnnotations(anns => [...anns, {
              id: Date.now().toString(),
              bbox: [x, y, w, h],
              label: selectedLabel || 'unlabeled',
              answer: {},
            }]);
          }
          return null;
        });
      },
    })
  ).current;

  const removeAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedAnnotation === id) setSelectedAnnotation(null);
  };

  const changeAnnotationLabel = (id, newLabel) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, label: newLabel } : a));
  };

  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    try {
      await tasksAPI.label(taskId, {
        labels: { objects: annotations },
        status: 'in_progress',
      });
      if (andSubmit) {
        setSubmitting(true);
        await tasksAPI.submit(taskId);
        Alert.alert('Submitted!', 'Task submitted for review.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Saved!', 'Labels saved successfully.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Labeling" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  const labels = task?.projectId?.labelSet || [];
  const imageUrl = getImageUrl();

  return (
    <Screen>
      <Header
        title="Labeling"
        subtitle={`${annotations.length} annotations`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Label Selector */}
        <View style={styles.labelBar}>
          <Text style={styles.labelBarTitle}>Active Label:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelScroll}>
            {labels.length === 0 ? (
              <View style={styles.noLabelChip}>
                <Text style={styles.noLabelText}>No labels defined</Text>
              </View>
            ) : (
              labels.map(l => (
                <TouchableOpacity
                  key={l.name}
                  style={[
                    styles.labelChip,
                    { borderColor: l.color + '88' },
                    selectedLabel === l.name && { backgroundColor: l.color + '33', borderColor: l.color }
                  ]}
                  onPress={() => setSelectedLabel(l.name)}
                >
                  <View style={[styles.labelDot, { backgroundColor: l.color }]} />
                  <Text style={[styles.labelChipText, selectedLabel === l.name && { color: l.color }]}>
                    {l.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Canvas */}
        <View style={styles.canvasContainer}>
          {imageUrl ? (
            <View
              style={[styles.canvas, { height: imgSize.height }]}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{ width: SCREEN_W, height: imgSize.height }}
                resizeMode="contain"
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  const ratio = height / width;
                  setImgSize({ width: SCREEN_W, height: Math.min(SCREEN_W * ratio, 350) });
                }}
              />
              <Svg
                style={StyleSheet.absoluteFill}
                width={SCREEN_W}
                height={imgSize.height}
              >
                {annotations.map((ann, i) => {
                  const labelDef = labels.find(l => l.name === ann.label);
                  const color = labelDef?.color || COLORS.primary;
                  const [x, y, w, h] = ann.bbox;
                  const isSelected = selectedAnnotation === ann.id;
                  return (
                    <React.Fragment key={ann.id || i}>
                      <Rect
                        x={x} y={y} width={w} height={h}
                        stroke={color}
                        strokeWidth={isSelected ? 3 : 2}
                        fill={color + '22'}
                      />
                      <SvgText
                        x={x + 4} y={y + 16}
                        fontSize="11"
                        fill={color}
                        fontWeight="bold"
                      >
                        {ann.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
                {drawing && (
                  <Rect
                    x={Math.min(drawing.startX, drawing.endX)}
                    y={Math.min(drawing.startY, drawing.endY)}
                    width={Math.abs(drawing.endX - drawing.startX)}
                    height={Math.abs(drawing.endY - drawing.startY)}
                    stroke={labels.find(l => l.name === selectedLabel)?.color || COLORS.primary}
                    strokeWidth={2}
                    strokeDasharray="6,3"
                    fill="transparent"
                  />
                )}
              </Svg>
            </View>
          ) : (
            <View style={styles.noImageBox}>
              <Ionicons name="image-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          <Text style={styles.drawHint}>✏️ Draw a box on the image to annotate</Text>
        </View>

        {/* Annotations List */}
        {annotations.length > 0 && (
          <View style={styles.annList}>
            <Text style={styles.annListTitle}>Annotations ({annotations.length})</Text>
            {annotations.map((ann, i) => {
              const labelDef = labels.find(l => l.name === ann.label);
              const color = labelDef?.color || COLORS.primary;
              return (
                <View key={ann.id || i} style={[styles.annItem, selectedAnnotation === ann.id && { borderColor: color }]}>
                  <TouchableOpacity
                    style={styles.annItemMain}
                    onPress={() => setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id)}
                  >
                    <View style={[styles.annDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.annLabel, { color }]}>{ann.label}</Text>
                      <Text style={styles.annCoords}>
                        x:{Math.round(ann.bbox[0])} y:{Math.round(ann.bbox[1])} w:{Math.round(ann.bbox[2])} h:{Math.round(ann.bbox[3])}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {selectedAnnotation === ann.id && labels.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relabelRow}>
                      {labels.filter(l => l.name !== ann.label).map(l => (
                        <TouchableOpacity
                          key={l.name}
                          style={[styles.relabelBtn, { borderColor: l.color }]}
                          onPress={() => changeAnnotationLabel(ann.id, l.name)}
                        >
                          <Text style={[styles.relabelText, { color: l.color }]}>{l.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity style={styles.annDelete} onPress={() => removeAnnotation(ann.id)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Review Notes (for rejected tasks) */}
        {task?.reviewNotes?.length > 0 && (
          <Card style={styles.reviewNotesCard}>
            <Text style={styles.reviewNotesTitle}>🔴 Reviewer Feedback</Text>
            {task.reviewNotes.map((note, i) => (
              <View key={i} style={styles.reviewNote}>
                <Text style={styles.reviewNoteText}>• {note.comment}</Text>
                {note.label && <Text style={styles.reviewNoteLabel}>Label: {note.label}</Text>}
              </View>
            ))}
          </Card>
        )}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title="Save"
            onPress={() => handleSave(false)}
            loading={saving}
            variant="secondary"
            icon="save-outline"
            style={{ flex: 1 }}
          />
          <Button
            title="Save & Submit"
            onPress={() => {
              if (annotations.length === 0) {
                Alert.alert('No Annotations', 'Please add at least one annotation before submitting.');
                return;
              }
              Alert.alert('Submit?', 'Submit this task for review?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: () => handleSave(true) }
              ]);
            }}
            loading={submitting}
            variant="success"
            icon="paper-plane-outline"
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  labelBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  labelBarTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginRight: SPACING.sm },
  labelScroll: { flex: 1 },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated, marginRight: 6,
  },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  labelChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  noLabelChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full,
  },
  noLabelText: { fontSize: 12, color: COLORS.textMuted },
  canvasContainer: { margin: SPACING.lg, marginBottom: 0 },
  canvas: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
  },
  noImageBox: {
    height: 200, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
  },
  noImageText: { fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.sm },
  drawHint: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center',
    marginTop: SPACING.sm, marginBottom: SPACING.md,
  },
  annList: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  annListTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  annItem: {
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  annItemMain: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, paddingRight: 44,
  },
  annDot: { width: 10, height: 10, borderRadius: 5 },
  annLabel: { fontSize: 13, fontWeight: '700' },
  annCoords: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  annDelete: {
    position: 'absolute', right: SPACING.sm, top: '50%',
    transform: [{ translateY: -10 }],
  },
  relabelRow: {
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
  },
  relabelBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, marginRight: 6,
  },
  relabelText: { fontSize: 11, fontWeight: '600' },
  reviewNotesCard: {
    margin: SPACING.lg, marginTop: 0,
    backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger + '44',
  },
  reviewNotesTitle: { fontSize: 14, fontWeight: '700', color: COLORS.danger, marginBottom: SPACING.sm },
  reviewNote: { marginBottom: SPACING.xs },
  reviewNoteText: { fontSize: 13, color: COLORS.textPrimary },
  reviewNoteLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bottomActions: {
    flexDirection: 'row', gap: SPACING.md,
    margin: SPACING.lg, marginTop: SPACING.md, marginBottom: 100,
  },
});
