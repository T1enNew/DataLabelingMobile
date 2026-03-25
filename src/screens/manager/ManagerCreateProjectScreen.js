import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI } from '../../services/api';
import { Screen, Header, Card, Input, Button, Tag } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const LABEL_COLORS = ['#FF4757', '#4F8EF7', '#00E5A0', '#F7B731', '#A78BFA', '#FF6B81', '#00D2D3', '#FF9F43'];

export default function ManagerCreateProjectScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    guidelines: '',
    status: 'draft',
    reviewPolicy: { mode: 'full', sampleRate: 0.1 },
  });
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  const addLabel = () => {
    if (!newLabel.trim()) return;
    if (labels.find(l => l.name.toLowerCase() === newLabel.toLowerCase())) {
      Alert.alert('Error', 'Label already exists');
      return;
    }
    setLabels(prev => [...prev, { name: newLabel.trim(), color: newLabelColor, description: '' }]);
    setNewLabel('');
    setNewLabelColor(LABEL_COLORS[(labels.length + 1) % LABEL_COLORS.length]);
  };

  const removeLabel = (name) => setLabels(prev => prev.filter(l => l.name !== name));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Project name is required';
    if (!form.guidelines.trim()) e.guidelines = 'Guidelines are required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await projectsAPI.create({ ...form, labelSet: labels });
      Alert.alert('Success', 'Project created!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_OPTIONS = ['draft', 'active'];

  return (
    <Screen>
      <Header title="Create Project" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Card>
          <Input label="Project Name *" value={form.name} onChangeText={v => set('name', v)}
            placeholder="e.g. Traffic Signs Labeling" icon="folder-outline" error={errors.name} />
          <Input label="Description" value={form.description} onChangeText={v => set('description', v)}
            placeholder="Brief description of the project..." multiline numberOfLines={3} icon="document-text-outline" />
          <Input label="Guidelines *" value={form.guidelines} onChangeText={v => set('guidelines', v)}
            placeholder="Detailed labeling guidelines and instructions..." multiline numberOfLines={5} icon="book-outline" error={errors.guidelines} />
        </Card>

        {/* Status */}
        <Text style={styles.sectionLabel}>INITIAL STATUS</Text>
        <View style={styles.optionRow}>
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.optionBtn, form.status === s && styles.optionBtnActive]}
              onPress={() => set('status', s)}
            >
              <Text style={[styles.optionText, form.status === s && styles.optionTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Review Policy */}
        <Text style={styles.sectionLabel}>REVIEW POLICY</Text>
        <Card>
          <View style={styles.optionRow}>
            {['full', 'sample'].map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.optionBtn, form.reviewPolicy.mode === mode && styles.optionBtnActive]}
                onPress={() => set('reviewPolicy', { ...form.reviewPolicy, mode })}
              >
                <Text style={[styles.optionText, form.reviewPolicy.mode === mode && styles.optionTextActive]}>
                  {mode === 'full' ? '📋 Full Review' : '🎲 Sample Review'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {form.reviewPolicy.mode === 'sample' && (
            <Input
              label="Sample Rate (0-1)"
              value={String(form.reviewPolicy.sampleRate)}
              onChangeText={v => set('reviewPolicy', { ...form.reviewPolicy, sampleRate: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              icon="shuffle-outline"
              style={{ marginTop: SPACING.md, marginBottom: 0 }}
            />
          )}
        </Card>

        {/* Label Set */}
        <Text style={styles.sectionLabel}>LABEL SET</Text>
        <Card>
          <View style={styles.addLabelRow}>
            <View style={styles.colorPicker}>
              {LABEL_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, newLabelColor === c && styles.colorDotActive]}
                  onPress={() => setNewLabelColor(c)}
                />
              ))}
            </View>
            <View style={styles.addLabelInput}>
              <TextInput
                style={styles.labelInput}
                placeholder="Label name..."
                placeholderTextColor={COLORS.textMuted}
                value={newLabel}
                onChangeText={setNewLabel}
                onSubmitEditing={addLabel}
              />
              <TouchableOpacity style={styles.addLabelBtn} onPress={addLabel}>
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
          {labels.length > 0 ? (
            <View style={styles.labelsContainer}>
              {labels.map(l => (
                <Tag key={l.name} label={l.name} color={l.color} onRemove={() => removeLabel(l.name)} />
              ))}
            </View>
          ) : (
            <Text style={styles.noLabels}>No labels added yet</Text>
          )}
        </Card>

        <Button title="Create Project" onPress={handleCreate} loading={loading} size="lg" icon="checkmark-outline" style={{ marginBottom: 100 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  optionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  optionBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionBtnActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  optionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  optionTextActive: { color: COLORS.primary },
  addLabelRow: { marginBottom: SPACING.md },
  colorPicker: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  colorDot: {
    width: 24, height: 24, borderRadius: 12,
  },
  colorDotActive: {
    borderWidth: 2, borderColor: COLORS.white,
    transform: [{ scale: 1.2 }],
  },
  addLabelInput: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  labelInput: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  addLabelBtn: {
    backgroundColor: COLORS.primary, width: 40, height: 40,
    borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
  },
  labelsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.xs },
  noLabels: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
});
