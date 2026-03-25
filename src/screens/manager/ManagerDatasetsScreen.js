// ─── ManagerDatasetsScreen ──────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, RefreshControl, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { datasetsAPI, projectsAPI } from '../../services/api';
import { Screen, Header, Card, Button, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export function ManagerDatasetsScreen({ navigation }) {
  const [datasets, setDatasets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const projRes = await projectsAPI.getAll();
      const projs = projRes.data;
      setProjects(projs);
      const dsResults = await Promise.allSettled(
        projs.map(p => datasetsAPI.getByProject(p._id))
      );
      const allDs = [];
      dsResults.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          res.value.data.forEach(ds => allDs.push({ ...ds, projectName: projs[i].name }));
        }
      });
      setDatasets(allDs);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const handleDelete = (ds) => {
    Alert.alert('Delete Dataset', `Delete "${ds.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await datasetsAPI.delete(ds._id); loadData(); }
          catch (e) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <Card style={{ marginBottom: SPACING.md }}>
      <View style={styles.dsRow}>
        <View style={styles.dsIcon}>
          <Ionicons name="server" size={24} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dsName}>{item.name}</Text>
          <Text style={styles.dsMeta}>{item.projectName} · {item.totalItems} files</Text>
          <Text style={styles.dsDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.dsActions}>
        <TouchableOpacity style={styles.dsActionBtn} onPress={() => navigation.navigate('ManagerDatasetDetail', { dataset: item })}>
          <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
          <Text style={[styles.dsActionText, { color: COLORS.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dsActionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
          <Text style={[styles.dsActionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <Screen><Header title="Datasets" /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Datasets" subtitle={`${datasets.length} total`}
        rightAction={() => navigation.navigate('ManagerUploadDataset')} rightIcon="add" />
      <FlatList
        data={datasets}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <EmptyState icon="server-outline" title="No datasets" message="Upload your first dataset"
            action={() => navigation.navigate('ManagerUploadDataset')} actionLabel="Upload Dataset" />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  dsIcon: {
    width: 48, height: 48, backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
  },
  dsName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  dsMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dsDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  dsActions: {
    flexDirection: 'row', gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  dsActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
  },
  dsActionText: { fontSize: 12, fontWeight: '600' },
});

export default ManagerDatasetsScreen;
