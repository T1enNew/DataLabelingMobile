import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI, usersAPI, datasetsAPI } from '../../services/api';
import { Screen, Header, Card, Button, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ManagerAssignTaskScreen({ navigation, route }) {
  const { project } = route.params;
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      usersAPI.getAll(),
      datasetsAPI.getByProject(project._id),
    ]).then(([usersRes, dsRes]) => {
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value.data;
        setAnnotators(users.filter(u => u.role === 'annotator'));
        setReviewers(users.filter(u => u.role === 'reviewer'));
      }
      if (dsRes.status === 'fulfilled') setDatasets(dsRes.value.data);
    }).finally(() => setLoading(false));
  }, [project]);

  const toggleAnnotator = (id) => {
    setSelectedAnnotators(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleReviewer = (id) => {
    setSelectedReviewers(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedDataset) return Alert.alert('Error', 'Please select a dataset');
    if (selectedAnnotators.length === 0) return Alert.alert('Error', 'Please select at least one annotator');
    if (selectedReviewers.length === 0) return Alert.alert('Error', 'Please select at least one reviewer');

    setAssigning(true);
    try {
      const res = await tasksAPI.assign({
        projectId: project._id,
        datasetId: selectedDataset._id,
        annotatorIds: selectedAnnotators,
        reviewerIds: selectedReviewers,
      });
      Alert.alert('Success', `${res.data.tasksCreated} tasks assigned to ${res.data.annotatorsCount} annotator(s)!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <Screen><Header title="Assign Tasks" onBack={() => navigation.goBack()} /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Assign Tasks" subtitle={project.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Dataset */}
        <Text style={styles.sectionLabel}>SELECT DATASET *</Text>
        {datasets.length === 0 ? (
          <Card>
            <Text style={styles.noData}>No datasets for this project. Upload one first.</Text>
          </Card>
        ) : (
          datasets.map(ds => (
            <TouchableOpacity
              key={ds._id}
              style={[styles.selectCard, selectedDataset?._id === ds._id && styles.selectCardActive]}
              onPress={() => setSelectedDataset(ds)}
            >
              <View style={[styles.radio, selectedDataset?._id === ds._id && styles.radioActive]}>
                {selectedDataset?._id === ds._id && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="server-outline" size={20} color={selectedDataset?._id === ds._id ? COLORS.primary : COLORS.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectName, selectedDataset?._id === ds._id && { color: COLORS.primary }]}>{ds.name}</Text>
                <Text style={styles.selectMeta}>{ds.totalItems} files</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Annotators */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
          ANNOTATORS ({selectedAnnotators.length} selected)
        </Text>
        {annotators.length === 0 ? (
          <Card><Text style={styles.noData}>No active annotators available</Text></Card>
        ) : (
          annotators.map(u => (
            <TouchableOpacity
              key={u._id}
              style={[styles.selectCard, selectedAnnotators.includes(u._id) && styles.selectCardActive]}
              onPress={() => toggleAnnotator(u._id)}
            >
              <View style={[styles.checkbox, selectedAnnotators.includes(u._id) && styles.checkboxActive]}>
                {selectedAnnotators.includes(u._id) && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <View style={[styles.avatar, { backgroundColor: COLORS.roleAnnotator + '22' }]}>
                <Text style={[styles.avatarText, { color: COLORS.roleAnnotator }]}>
                  {u.fullName?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectName, selectedAnnotators.includes(u._id) && { color: COLORS.primary }]}>
                  {u.fullName}
                </Text>
                <Text style={styles.selectMeta}>{u.specialty} · @{u.username}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Reviewers */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
          REVIEWERS ({selectedReviewers.length} selected)
        </Text>
        {reviewers.length === 0 ? (
          <Card><Text style={styles.noData}>No active reviewers available</Text></Card>
        ) : (
          reviewers.map(u => (
            <TouchableOpacity
              key={u._id}
              style={[styles.selectCard, selectedReviewers.includes(u._id) && styles.selectCardActive]}
              onPress={() => toggleReviewer(u._id)}
            >
              <View style={[styles.checkbox, selectedReviewers.includes(u._id) && styles.checkboxActive]}>
                {selectedReviewers.includes(u._id) && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <View style={[styles.avatar, { backgroundColor: COLORS.roleReviewer + '22' }]}>
                <Text style={[styles.avatarText, { color: COLORS.roleReviewer }]}>
                  {u.fullName?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectName, selectedReviewers.includes(u._id) && { color: COLORS.primary }]}>
                  {u.fullName}
                </Text>
                <Text style={styles.selectMeta}>{u.specialty} · @{u.username}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Summary */}
        {selectedAnnotators.length > 0 && selectedDataset && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Assignment Summary</Text>
            <Text style={styles.summaryText}>
              📁 Dataset: <Text style={styles.summaryHighlight}>{selectedDataset.name}</Text>
            </Text>
            <Text style={styles.summaryText}>
              📊 Files: <Text style={styles.summaryHighlight}>{selectedDataset.totalItems}</Text>
            </Text>
            <Text style={styles.summaryText}>
              👤 Annotators: <Text style={styles.summaryHighlight}>{selectedAnnotators.length}</Text>
            </Text>
            <Text style={styles.summaryText}>
              👁 Reviewers: <Text style={styles.summaryHighlight}>{selectedReviewers.length}</Text>
            </Text>
            <Text style={styles.summaryText}>
              📋 Total tasks: <Text style={styles.summaryHighlight}>
                {selectedDataset.totalItems * selectedAnnotators.length}
              </Text>
            </Text>
          </Card>
        )}

        <Button
          title="Assign Tasks"
          onPress={handleAssign}
          loading={assigning}
          size="lg"
          icon="people-outline"
          disabled={!selectedDataset || selectedAnnotators.length === 0 || selectedReviewers.length === 0}
          style={{ marginBottom: 100 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm,
  },
  selectCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  selectCardActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  avatar: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  selectName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  selectMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  noData: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },
  summaryCard: {
    backgroundColor: COLORS.accentGlow, borderColor: COLORS.accent + '44',
    marginTop: SPACING.lg,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.accent, marginBottom: SPACING.sm },
  summaryText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  summaryHighlight: { fontWeight: '700', color: COLORS.textPrimary },
});
