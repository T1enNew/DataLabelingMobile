import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const QUICK_LOGINS = [
    { label: 'Admin', email: 'admin@example.com', pass: 'admin123', color: COLORS.roleAdmin },
    { label: 'Manager', email: 'manager@example.com', pass: 'manager123', color: COLORS.roleManager },
    { label: 'Annotator', email: 'annotator1@example.com', pass: 'annotator123', color: COLORS.roleAnnotator },
    { label: 'Reviewer', email: 'reviewer1@example.com', pass: 'reviewer123', color: COLORS.roleReviewer },
  ];

  return (
    <LinearGradient colors={[COLORS.bg, '#0D1117', COLORS.bgCard]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Area */}
          <View style={styles.logoArea}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="layers" size={36} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.appName}>DataLabel</Text>
            <Text style={styles.appTagline}>Professional Annotation Platform</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>

            <Input
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: null })); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
              placeholder="••••••••"
              secureTextEntry={!showPass}
              icon="lock-closed-outline"
              rightIcon={showPass ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPass(!showPass)}
              error={errors.password}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={{ marginTop: SPACING.sm }}
            />
          </View>

          {/* Quick Login (Dev) */}
          <View style={styles.quickLogin}>
            <View style={styles.quickLoginDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Quick Login</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.quickBtns}>
              {QUICK_LOGINS.map((ql) => (
                <TouchableOpacity
                  key={ql.label}
                  style={[styles.quickBtn, { borderColor: ql.color + '66' }]}
                  onPress={() => { setEmail(ql.email); setPassword(ql.pass); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickDot, { backgroundColor: ql.color }]} />
                  <Text style={[styles.quickBtnText, { color: ql.color }]}>{ql.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Version */}
          <Text style={styles.version}>Team8-WDP v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  form: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxl,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  quickLogin: {
    marginBottom: SPACING.xl,
  },
  quickLoginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    fontWeight: '500',
  },
  quickBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.bgElevated,
  },
  quickDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
