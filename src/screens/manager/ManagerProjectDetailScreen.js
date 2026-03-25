import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, datasetsAPI } from '../../services/api';
import { Screen, Header, Card, StatusBadge, Button, Tag, StatCard, SectionTitle, Loading, Divider } from '../../components/UI';
import { COLORS, SPACING, RADIUS, STATUS_CONFIG } from '../../theme';

export default function ManagerProjectDetailScreen({ navigation, route }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState([]);
  const [quality, setQuality] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projRes, qualRes, dsRes] = await Promise.allSettled([
        projectsAPI.getById(projectId),
        projectsAPI.quality(projectId),
        datasetsAPI.getByProject(projectId),
      ]);
      if (projRes.status === 'fulfilled') {
        setProject(projRes.value.data.project);
        setStats(projRes.value.data.stats || []);
      }
      if (qualRes.status === 'fulfilled') setQuality(qualRes.value.data);
      if (dsRes.status === 'fulfilled') setDatasets(dsRes.value.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = (format) => {
    Alert.alert('Export Data', `Export as ${format.toUpperCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Export',
        onPress: async () => {
          setExportLoading(true);
          try {
            await projectsAPI.export(projectId, format);
            Alert.alert('Success', `Export initiated in ${format} format`);
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setExportLoading(false);
          }
        }
      }
    ]);
  };

  const statusCounts = {};
  stats.forEach(s => { statusCounts[s._id] = s.count; });

  if (loading) return <Screen><Header title="Project" onBack={() => navigation.goBack()} /><Loading /></Screen>;
  if (!project) return <Screen><Header title="Not Found" onBack={() => navigation.goBack()} /></Screen>;

  return (
    <Screen>
      <Header
        title={project.name}
        subtitle={project.status}
        onBack={() => navigation.goBack()}
        rightAction={() => navigation.navigate('ManagerApprovedDataset', { projectId })}
        rightIcon="checkmark-done-outline"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <StatusBadge status={project.status} />
          <View style={styles.reviewPolicyTag}>
            <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.info} />
            <Text style={styles.reviewPolicyText}>
              {project.reviewPolicy?.mode === 'sample'
                ? `${Math.round((project.reviewPolicy.sampleRate || 0) * 100)}% Sample Review`
                : 'Full Review'}
            </Text>
          </View>
        </View>

        {/* Task Stats */}
        <SectionTitle title="Task Statistics" />
        <View style={styles.statsRow}>
          <StatCard label="Total" value={quality?.total || 0} icon="layers-outline" color={COLORS.primary} />
          <StatCard label="Approved" value={quality?.approved || 0} icon="checkmark-circle-outline" color={COLORS.accent} />
          <StatCard label="Rejected" value={quality?.rejected || 0} icon="close-circle-outline" color={COLORS.danger} />
          <StatCard label="Pending" value={quality?.submitted || 0} icon="time-outline" color={COLORS.warning} />
        </View>
        {quality && (
          <Card style={styles.rateCard}>
            <View style={styles.rateRow}>
              <View style={styles.rateItem}>
                <Text style={[styles.rateValue, { color: COLORS.accent }]}>{quality.approvalRate}%</Text>
                <Text style={styles.rateLabel}>Approval Rate</Text>
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateItem}>
                <Text style={[styles.rateValue, { color: COLORS.danger }]}>{quality.rejectionRate}%</Text>
                <Text style={styles.rateLabel}>Rejection Rate</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Description */}
        {project.description ? (
          <>
            <SectionTitle title="Description" />
            <Card>
              <Text style={styles.descText}>{project.description}</Text>
            </Card>
          </>
        ) : null}

        {/* Guidelines */}
        <SectionTitle title="Guidelines" />
        <Card>
          <Text style={styles.guidelinesText}>{project.guidelines}</Text>
        </Card>

        {/* Label Set */}
        {project.labelSet?.length > 0 && (
          <>
            <SectionTitle title={`Label Set (${project.labelSet.length})`} />
            <Card>
              <View style={styles.labelsGrid}>
                {project.labelSet.map(l => (
                  <Tag key={l.name} label={l.name} color={l.color} />
                ))}
              </View>
            </Card>
          </>
        )}

        {/* Datasets */}
        <SectionTitle title={`Datasets (${datasets.length})`} />
        {datasets.length === 0 ? (
          <Card>
            <Text style={styles.noData}>No datasets uploaded yet</Text>
          </Card>
        ) : (
          datasets.map(ds => (
            <Card key={ds._id} style={styles.datasetCard}>
              <View style={styles.datasetRow}>
                <Ionicons name="server-outline" size={20} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.datasetName}>{ds.name}</Text>
                  <Text style={styles.datasetMeta}>{ds.totalItems} files · {new Date(ds.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Actions */}
        <SectionTitle title="Actions" />
        <View style={styles.actionsGrid}>
          <Button
            title="Assign Tasks"
            onPress={() => navigation.navigate('ManagerAssignTask', { project })}
            variant="primary"
            icon="people-outline"
            style={styles.actionBtn}
          />
          <Button
            title="Approved Data"
            onPress={() => navigation.navigate('ManagerApprovedDataset', { projectId })}
            variant="secondary"
            icon="checkmark-done-outline"
            style={styles.actionBtn}
          />
        </View>

        <SectionTitle title="Export Approved Data" />
        <View style={styles.exportRow}>
          {['json', 'csv', 'coco'].map(fmt => (
            <Button
              key={fmt}
              title={fmt.toUpperCase()}
              onPress={() => handleExport(fmt)}
              variant="ghost"
              loading={exportLoading}
              style={styles.exportBtn}
              icon="download-outline"
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 100 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  reviewPolicyTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.info + '22', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.info + '44',
  },
  reviewPolicyText: { fontSize: 12, fontWeight: '600', color: COLORS.info },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  rateCard: { marginBottom: SPACING.md },
  rateRow: { flexDirection: 'row', alignItems: 'center' },
  rateItem: { flex: 1, alignItems: 'center' },
  rateValue: { fontSize: 28, fontWeight: '800' },
  rateLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rateDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  guidelinesText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  labelsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  noData: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },
  datasetCard: { marginBottom: SPACING.sm, padding: SPACING.md },
  datasetRow: { flexDirection: 'row', alignItems: 'center' },
  datasetName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  datasetMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionsGrid: { gap: SPACING.sm, marginBottom: SPACING.md },
  actionBtn: { marginBottom: SPACING.xs },
  exportRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 100 },
  exportBtn: { flex: 1 },
});
