import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { tasksAPI } from '../../services/api';
import { Screen, Card, StatCard } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

export default function AnnotatorProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    tasksAPI.myTasks().then(res => {
      const tasks = res.data;
      setStats({
        total: tasks.length,
        submitted: tasks.filter(t => t.status === 'submitted').length,
        approved: tasks.filter(t => t.status === 'approved').length,
        rejected: tasks.filter(t => t.status === 'rejected').length,
      });
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const roleConfig = ROLE_CONFIG[user?.role] || {};

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <LinearGradient
          colors={[COLORS.roleAnnotator, COLORS.roleAnnotator + '88']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </LinearGradient>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <View style={styles.roleTag}>
          <Ionicons name="color-wand-outline" size={14} color={COLORS.roleAnnotator} />
          <Text style={[styles.roleTagText, { color: COLORS.roleAnnotator }]}>Annotator</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Performance Stats */}
        <Text style={styles.sectionLabel}>MY PERFORMANCE</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total" value={stats.total} icon="layers-outline" color={COLORS.primary} />
          <StatCard label="Approved" value={stats.approved} icon="checkmark-circle-outline" color={COLORS.accent} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Submitted" value={stats.submitted} icon="paper-plane-outline" color={COLORS.warning} />
          <StatCard label="Rejected" value={stats.rejected} icon="close-circle-outline" color={COLORS.danger} />
        </View>
        {stats.approved + stats.rejected > 0 && (
          <Card style={styles.rateCard}>
            <Text style={styles.rateLabel}>Approval Rate</Text>
            <Text style={styles.rateValue}>
              {Math.round(stats.approved / (stats.approved + stats.rejected) * 100)}%
            </Text>
          </Card>
        )}

        {/* Info */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>ACCOUNT INFO</Text>
        <Card>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="star-outline" label="Specialty" value={user?.specialty || 'General'} />
          <InfoRow icon="shield-checkmark-outline" label="Status" value="Active" valueColor={COLORS.accent} />
        </Card>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ width: 24 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center', paddingTop: 60, paddingBottom: SPACING.xxl,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  username: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, marginBottom: SPACING.sm },
  roleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
    backgroundColor: COLORS.roleAnnotator + '22', borderColor: COLORS.roleAnnotator + '55',
  },
  roleTagText: { fontSize: 12, fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm,
  },
  statsRow: { flexDirection: 'row' },
  rateCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  rateLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  rateValue: { fontSize: 36, fontWeight: '800', color: COLORS.accent },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.lg,
    backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.danger + '44', marginTop: SPACING.xl, marginBottom: 100,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
});
