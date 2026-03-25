import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAPI } from '../../services/api';
import { Screen, Card, StatusBadge, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ReviewerHistoryScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadTasks = useCallback(async () => {
    try {
      const res = await reviewsAPI.getReviewed();
      setTasks(res.data);
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

  const filteredByStatus = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const filtered = filteredByStatus.filter((t) => {
    if (typeFilter === 'all') return true;
    const mime = (t?.dataItem?.mimeType || '').toLowerCase();
    if (typeFilter === 'image') return mime.startsWith('image/');
    if (typeFilter === 'text') return mime.startsWith('text/');
    if (typeFilter === 'audio') return mime.startsWith('audio/');
    return true;
  });

  const renderTask = ({ item }) => {
    const mime = item?.dataItem?.mimeType || '';
    const typeMeta = mime.startsWith('audio/')
      ? {
          icon: 'musical-notes',
          iconColor: '#FFD28C',
          wrapBg: 'rgba(255,183,77,0.20)',
          wrapBorder: 'rgba(255,183,77,0.55)',
        }
      : mime.startsWith('text/')
        ? {
            icon: 'document-text',
            iconColor: '#B9C8FF',
            wrapBg: 'rgba(167,139,250,0.20)',
            wrapBorder: 'rgba(167,139,250,0.55)',
          }
        : {
            icon: 'image',
            iconColor: '#8FD7FF',
            wrapBg: 'rgba(79,142,247,0.20)',
            wrapBorder: 'rgba(79,142,247,0.55)',
          };

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ReviewerTask', { taskId: item._id, mode: 'history' })}
        accent={item.status === 'approved' ? COLORS.accent : COLORS.danger}
      >
        <View style={styles.cardHeaderCompact}>
          <View style={[
            styles.typeIconWrap,
            { backgroundColor: typeMeta.wrapBg, borderColor: typeMeta.wrapBorder },
          ]}>
            <Ionicons name={typeMeta.icon} size={16} color={typeMeta.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName} numberOfLines={1}>{item.projectId?.name || '-'}</Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              {item.annotatorId?.fullName || '-'} • {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '-'}
            </Text>
          </View>
          <StatusBadge status={item.status} small />
        </View>

        {item.status === 'rejected' && item.reviewComments && (
          <Text style={styles.rejectNoteInline} numberOfLines={1}>Lý do: {item.reviewComments}</Text>
        )}
      </Card>
    );
  };

  if (loading) return <Screen><Loading /></Screen>;

  const approved = tasks.filter(t => t.status === 'approved').length;
  const rejected = tasks.filter(t => t.status === 'rejected').length;

  return (
    <Screen>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Review History</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: COLORS.accent }]} />
            <Text style={[styles.statChipText, { color: COLORS.accent }]}>{approved} approved</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
            <Text style={[styles.statChipText, { color: COLORS.danger }]}>{rejected} rejected</Text>
          </View>
        </View>
      </View>
      <View style={styles.filterBar}>
        {['all', 'approved', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && { color: COLORS.primary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterBarType}>
        {[
          { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: COLORS.textSecondary },
          { key: 'text', label: 'Text', icon: 'document-text-outline', color: '#A78BFA' },
          { key: 'audio', label: 'Audio', icon: 'musical-notes-outline', color: '#FFB74D' },
          { key: 'image', label: 'Image', icon: 'image-outline', color: '#4FC3F7' },
        ].map((f) => {
          const active = typeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                styles.filterTypeBtn,
                active && styles.filterBtnActive,
                active && f.key !== 'all' && { borderColor: `${f.color}CC`, backgroundColor: `${f.color}22` },
              ]}
              onPress={() => setTypeFilter(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={12}
                color={active ? f.color : (f.key === 'all' ? COLORS.textSecondary : `${f.color}B3`)}
              />
              <Text
                style={[
                  styles.filterText,
                  f.key !== 'all' && { color: active ? f.color : `${f.color}CC` },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        data={filtered}
        renderItem={renderTask}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTasks(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="No history yet" message="Reviewed tasks will appear here" />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statChipText: { fontSize: 13, fontWeight: '600' },
  filterBar: {
    flexDirection: 'row', paddingTop: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.xs,
    backgroundColor: COLORS.bgCard,
  },
  filterBarType: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
  },
  filterTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBtnActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  card: { marginBottom: SPACING.sm, paddingVertical: SPACING.md },
  cardHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  projectName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  metaLine: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rejectNoteInline: { fontSize: 11, color: COLORS.danger, marginTop: SPACING.xs },
});
