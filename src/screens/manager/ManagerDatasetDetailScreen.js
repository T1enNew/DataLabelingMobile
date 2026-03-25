// ─── ManagerDatasetDetailScreen ─────────────────────────────────────────────
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../services/api';
import { Screen, Header, Card, SectionTitle } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { Image } from 'react-native';

export function ManagerDatasetDetailScreen({ navigation, route }) {
  const { dataset } = route.params;

  return (
    <Screen>
      <Header title={dataset.name} subtitle={`${dataset.totalItems} files`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Files</Text>
            <Text style={styles.infoValue}>{dataset.totalItems}</Text>
          </View>
          {dataset.description ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{dataset.description}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{new Date(dataset.createdAt).toLocaleString()}</Text>
          </View>
        </Card>

        <SectionTitle title="Files" />
        <View style={styles.fileGrid}>
          {(dataset.files || []).map((f, i) => (
            <View key={i} style={styles.fileCard}>
              {f.mimeType?.startsWith('image/') ? (
                <Image
                  source={{ uri: `${BASE_URL}/${f.path}` }}
                  style={styles.fileThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fileIconContainer}>
                  <Ionicons name="document-outline" size={28} color={COLORS.textMuted} />
                </View>
              )}
              <Text style={styles.fileName} numberOfLines={1}>{f.originalName || f.filename}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 100 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  fileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fileCard: {
    width: '30%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  fileThumb: { width: '100%', height: 80 },
  fileIconContainer: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  fileName: {
    fontSize: 10, color: COLORS.textMuted,
    padding: 4, textAlign: 'center',
  },
});

export default ManagerDatasetDetailScreen;
