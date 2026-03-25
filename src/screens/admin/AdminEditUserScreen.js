import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, TouchableOpacity, View, Text } from 'react-native';
import { usersAPI } from '../../services/api';
import { Screen, Header, Input, Button, Card } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

const ROLES = ['admin', 'manager', 'annotator', 'reviewer'];

export default function AdminEditUserScreen({ navigation, route }) {
  const { user } = route.params;
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    role: user.role || 'annotator',
    isActive: user.isActive !== false,
    specialty: user.specialty || 'general',
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await usersAPI.update(user._id, form);
      Alert.alert('Success', 'User updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Edit User" subtitle={user.username} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Input label="Full Name" value={form.fullName} onChangeText={v => set('fullName', v)}
            placeholder="Full name" icon="person-outline" />
          <Input label="Specialty" value={form.specialty} onChangeText={v => set('specialty', v)}
            placeholder="e.g. general, medical" icon="star-outline" />
        </Card>

        <Text style={styles.sectionLabel}>ROLE</Text>
        <View style={styles.roleGrid}>
          {ROLES.map(r => {
            const config = ROLE_CONFIG[r];
            const active = form.role === r;
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleOption,
                  active && { backgroundColor: config.color + '22', borderColor: config.color }
                ]}
                onPress={() => set('role', r)}
              >
                <View style={[styles.roleRadio, active && { borderColor: config.color }]}>
                  {active && <View style={[styles.roleRadioInner, { backgroundColor: config.color }]} />}
                </View>
                <Text style={[styles.roleOptionText, active && { color: config.color }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>STATUS</Text>
        <Card>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => set('isActive', !form.isActive)}
          >
            <View>
              <Text style={styles.toggleLabel}>Account Active</Text>
              <Text style={styles.toggleDesc}>User can log in and use the system</Text>
            </View>
            <View style={[styles.toggle, form.isActive && styles.toggleOn]}>
              <View style={[styles.toggleKnob, form.isActive && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </Card>

        <Button
          title="Save Changes"
          onPress={handleUpdate}
          loading={loading}
          size="lg"
          icon="checkmark-outline"
          style={{ marginTop: SPACING.lg }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  roleGrid: { gap: SPACING.sm },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  roleRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  roleRadioInner: { width: 10, height: 10, borderRadius: 5 },
  roleOptionText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  toggleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: COLORS.accent + '44', borderColor: COLORS.accent },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.textMuted,
  },
  toggleKnobOn: {
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-end',
  },
});
