import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Screen, Card, Divider } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

export default function ManagerProfileScreen() {
  const { user, logout } = useAuth();
  const roleConfig = ROLE_CONFIG[user?.role] || {};

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <Screen>
      <LinearGradient colors={[COLORS.bgCard, COLORS.bg]} style={styles.header}>
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={[roleConfig.color || COLORS.primary, (roleConfig.color || COLORS.primary) + '88']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <View style={[styles.roleTag, { backgroundColor: (roleConfig.color || COLORS.primary) + '22', borderColor: (roleConfig.color || COLORS.primary) + '55' }]}>
          <Ionicons name={roleConfig.icon || 'person-outline'} size={14} color={roleConfig.color || COLORS.primary} />
          <Text style={[styles.roleTagText, { color: roleConfig.color || COLORS.primary }]}>{roleConfig.label}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="person-outline" label="Username" value={`@${user?.username}`} />
          <InfoRow icon="star-outline" label="Specialty" value={user?.specialty || 'General'} />
          <InfoRow icon="shield-checkmark-outline" label="Account Status" value="Active" valueColor={COLORS.accent} />
        </Card>

        <Divider />

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
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: SPACING.xxl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarWrap: { marginBottom: SPACING.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  username: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md },
  roleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  roleTagText: { fontSize: 13, fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoIcon: { width: 28 },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.lg,
    backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.danger + '44',
    marginBottom: 100,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
});
