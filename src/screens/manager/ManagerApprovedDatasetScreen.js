// ─── ManagerApprovedDatasetScreen ───────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI, datasetsAPI } from '../../services/api';
import { Screen, Header, Card, StatusBadge, Loading, EmptyState } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export function ManagerApprovedDatasetScreen({ navigation, route }) {
  const { projectId } = route.params;
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      datasetsAPI.getByProject(projectId),
    ]).then(([dsRes]) => {
      if (dsRes.status === 'fulfilled') setDatasets(dsRes.value.data);
    }).finally(() => setLoading(false));
  }, [projectId]);

  // Group datasets by majority-approved tasks
  // A dataset is "approved" if majority of reviewer votes are approve
  const renderDataset = ({ item }) => (
    <Card
      key={item._id}
      style={styles.datasetCard}
      onPress={() => navigation.navigate('ManagerDatasetDetail', { dataset: item })}
    >
      <View style={styles.dsHeader}>
        <View style={styles.dsIconWrap}>
          <Ionicons name="server" size={22} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dsName}>{item.name}</Text>
          <Text style={styles.dsMeta}>{item.totalItems} files</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
      {item.description ? (
        <Text style={styles.dsDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.dsFooter}>
        <View style={styles.approvedTag}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.accent} />
          <Text style={styles.approvedText}>Majority Approved</Text>
        </View>
        <Text style={styles.dsDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </Card>
  );

  if (loading) return <Screen><Header title="Approved Datasets" onBack={() => navigation.goBack()} /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Approved Datasets" subtitle={`${datasets.length} datasets`} onBack={() => navigation.goBack()} />
      <FlatList
        data={datasets}
        renderItem={renderDataset}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState icon="checkmark-done-outline" title="No approved datasets" message="Datasets will appear here once majority-reviewed" />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  datasetCard: { marginBottom: SPACING.md },
  dsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  dsIconWrap: {
    width: 44, height: 44, backgroundColor: COLORS.accentGlow,
    borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
  },
  dsName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  dsMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dsDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm, lineHeight: 18 },
  dsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  approvedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.accentGlow, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  approvedText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  dsDate: { fontSize: 11, color: COLORS.textMuted },
});

export default ManagerApprovedDatasetScreen;
