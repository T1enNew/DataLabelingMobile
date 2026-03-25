import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { reviewsAPI } from '../../services/api';
import { Screen, Card, StatCard } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ReviewerProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    reviewsAPI.getAll().then(res => {
      setStats({
        pending: res.data.pending?.length || 0,
        approved: (res.data.reviewed || []).filter(t => t.status === 'approved').length,
        rejected: (res.data.reviewed || []).filter(t => t.status === 'rejected').length,
      });
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <LinearGradient colors={[COLORS.roleReviewer, COLORS.roleReviewer + '88']} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </LinearGradient>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <View style={styles.roleTag}>
          <Ionicons name="eye-outline" size={14} color={COLORS.roleReviewer} />
          <Text style={[styles.roleTagText, { color: COLORS.roleReviewer }]}>Reviewer</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>MY STATS</Text>
        <View style={styles.statsRow}>
          <StatCard label="Approved" value={stats.approved} icon="checkmark-circle-outline" color={COLORS.accent} />
          <StatCard label="Rejected" value={stats.rejected} icon="close-circle-outline" color={COLORS.danger} />
          <StatCard label="Pending" value={stats.pending} icon="time-outline" color={COLORS.warning} />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>ACCOUNT</Text>
        <Card>
          {[
            { icon: 'mail-outline', label: 'Email', value: user?.email },
            { icon: 'person-outline', label: 'Username', value: `@${user?.username}` },
            { icon: 'star-outline', label: 'Specialty', value: user?.specialty || 'General' },
          ].map(row => (
            <View key={row.label} style={styles.infoRow}>
              <Ionicons name={row.icon} size={16} color={COLORS.textMuted} style={{ width: 24 }} />
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
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
    paddingHorizontal: SPACING.lg, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, backgroundColor: COLORS.roleReviewer + '22', borderColor: COLORS.roleReviewer + '55',
  },
  roleTagText: { fontSize: 12, fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm,
  },
  statsRow: { flexDirection: 'row' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.lg, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.danger + '44', marginTop: SPACING.xl, marginBottom: 100,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
});
