import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, TouchableOpacity, View, Text } from 'react-native';
import { authAPI } from '../../services/api';
import { Screen, Header, Input, Button, Card } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

const ROLES = ['admin', 'manager', 'annotator', 'reviewer'];

export default function AdminCreateUserScreen({ navigation }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', fullName: '', role: 'annotator', specialty: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username required';
    if (!form.email.trim()) e.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password required';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (!form.fullName.trim()) e.fullName = 'Full name required';
    if (!form.role) e.role = 'Role required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.register(form);
      Alert.alert('Success', 'User created successfully!', [
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
      <Header title="Create User" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Input label="Full Name" value={form.fullName} onChangeText={v => set('fullName', v)}
            placeholder="John Doe" icon="person-outline" error={errors.fullName} />
          <Input label="Username" value={form.username} onChangeText={v => set('username', v)}
            placeholder="johndoe" icon="at-outline" error={errors.username} />
          <Input label="Email" value={form.email} onChangeText={v => set('email', v)}
            placeholder="john@example.com" keyboardType="email-address" icon="mail-outline" error={errors.email} />
          <Input label="Password" value={form.password} onChangeText={v => set('password', v)}
            placeholder="Min 6 characters" secureTextEntry icon="lock-closed-outline" error={errors.password} />
          <Input label="Specialty (optional)" value={form.specialty} onChangeText={v => set('specialty', v)}
            placeholder="e.g. general, medical, sports" icon="star-outline" />
        </Card>

        <Text style={styles.roleLabel}>ROLE</Text>
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

        <Button
          title="Create User"
          onPress={handleCreate}
          loading={loading}
          size="lg"
          icon="person-add-outline"
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
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  roleGrid: {
    gap: SPACING.sm,
  },
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
