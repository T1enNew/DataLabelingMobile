import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, Switch, TouchableOpacity
} from 'react-native';
import { settingsAPI } from '../../services/api';
import { Screen, Header, Card, Input, Button, Loading, Divider } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function AdminSettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data);
      setForm(res.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (section, key, value) => {
    setForm(f => ({
      ...f,
      [section]: { ...(f[section] || {}), [key]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({
        general: form.general,
        storage: form.storage,
        tasks: form.tasks,
        review: form.review,
        notifications: form.notifications,
      });
      Alert.alert('Success', 'Settings saved!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Settings', 'Reset all settings to default values?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await settingsAPI.reset();
            loadSettings();
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  if (loading) return <Screen><Header title="Settings" /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="System Settings" subtitle="Configure platform behavior" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* General */}
        <Text style={styles.section}>GENERAL</Text>
        <Card>
          <Input
            label="Site Name"
            value={form.general?.siteName || ''}
            onChangeText={v => set('general', 'siteName', v)}
            icon="globe-outline"
          />
          <ToggleRow
            label="Maintenance Mode"
            desc="Prevent all user access"
            value={form.general?.maintenanceMode || false}
            onChange={v => set('general', 'maintenanceMode', v)}
            activeColor={COLORS.warning}
          />
          <ToggleRow
            label="Allow Registration"
            desc="Allow new users to register"
            value={form.general?.allowRegistration !== false}
            onChange={v => set('general', 'allowRegistration', v)}
          />
        </Card>

        {/* Storage */}
        <Text style={styles.section}>STORAGE & FILES</Text>
        <Card>
          <Input
            label="Max File Size (bytes)"
            value={String(form.storage?.maxFileSize || '')}
            onChangeText={v => set('storage', 'maxFileSize', parseInt(v) || 0)}
            keyboardType="numeric"
            icon="document-outline"
          />
          <Input
            label="Max Files Per Dataset"
            value={String(form.storage?.maxFilesPerDataset || '')}
            onChangeText={v => set('storage', 'maxFilesPerDataset', parseInt(v) || 0)}
            keyboardType="numeric"
            icon="folder-outline"
          />
        </Card>

        {/* Tasks */}
        <Text style={styles.section}>TASKS</Text>
        <Card>
          <Input
            label="Max Tasks Per Annotator"
            value={String(form.tasks?.maxTasksPerAnnotator || '')}
            onChangeText={v => set('tasks', 'maxTasksPerAnnotator', parseInt(v) || 0)}
            keyboardType="numeric"
            icon="checkbox-outline"
          />
          <ToggleRow
            label="Auto Assign Tasks"
            desc="Automatically assign tasks to annotators"
            value={form.tasks?.autoAssignEnabled || false}
            onChange={v => set('tasks', 'autoAssignEnabled', v)}
          />
        </Card>

        {/* Review */}
        <Text style={styles.section}>REVIEW</Text>
        <Card>
          <ToggleRow
            label="Require Review Comments"
            desc="Reviewers must comment on rejections"
            value={form.review?.requireReviewComments !== false}
            onChange={v => set('review', 'requireReviewComments', v)}
          />
          <Input
            label="Max Rejections Before Escalation"
            value={String(form.review?.maxRejectionsBeforeEscalation || '')}
            onChangeText={v => set('review', 'maxRejectionsBeforeEscalation', parseInt(v) || 0)}
            keyboardType="numeric"
            icon="warning-outline"
          />
        </Card>

        {/* Notifications */}
        <Text style={styles.section}>NOTIFICATIONS</Text>
        <Card>
          <ToggleRow label="Email on Task Assigned" value={form.notifications?.emailOnTaskAssigned || false}
            onChange={v => set('notifications', 'emailOnTaskAssigned', v)} />
          <ToggleRow label="Email on Task Submitted" value={form.notifications?.emailOnTaskSubmitted || false}
            onChange={v => set('notifications', 'emailOnTaskSubmitted', v)} />
          <ToggleRow label="Email on Task Reviewed" value={form.notifications?.emailOnTaskReviewed || false}
            onChange={v => set('notifications', 'emailOnTaskReviewed', v)} />
          <ToggleRow label="Email on Task Rejected" value={form.notifications?.emailOnTaskRejected !== false}
            onChange={v => set('notifications', 'emailOnTaskRejected', v)} />
        </Card>

        <View style={styles.actionRow}>
          <Button title="Save Settings" onPress={handleSave} loading={saving} style={{ flex: 1 }} icon="save-outline" />
        </View>
        <Button title="Reset to Defaults" onPress={handleReset} variant="ghost" style={{ marginBottom: 100 }} />
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({ label, desc, value, onChange, activeColor }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {desc && <Text style={styles.toggleDesc}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.bgElevated, true: (activeColor || COLORS.accent) + '66' }}
        thumbColor={value ? (activeColor || COLORS.accent) : COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  toggleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
});
