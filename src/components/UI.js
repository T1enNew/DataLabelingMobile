import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, STATUS_CONFIG, ROLE_CONFIG } from '../theme';

// ─── SCREEN WRAPPER ──────────────────────────────────────────
export const Screen = ({ children, style }) => (
  <View style={[styles.screen, style]}>
    {children}
  </View>
);

// ─── HEADER ──────────────────────────────────────────────────
export const Header = ({ title, subtitle, onBack, rightAction, rightIcon = 'add' }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
    {rightAction && (
      <TouchableOpacity onPress={rightAction} style={styles.headerRight}>
        <Ionicons name={rightIcon} size={22} color={COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── CARD ─────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, accent }) => {
  const cardStyle = [
    styles.card,
    accent && { borderLeftWidth: 3, borderLeftColor: accent },
    style,
  ];
  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
};

// ─── BUTTON ───────────────────────────────────────────────────
export const Button = ({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, iconRight, style, textStyle
}) => {
  const variantStyles = {
    primary: { bg: COLORS.primary, text: COLORS.white, border: COLORS.primary },
    secondary: { bg: COLORS.bgElevated, text: COLORS.textPrimary, border: COLORS.border },
    danger: { bg: COLORS.danger, text: COLORS.white, border: COLORS.danger },
    success: { bg: COLORS.accent, text: COLORS.bg, border: COLORS.accent },
    ghost: { bg: 'transparent', text: COLORS.primary, border: COLORS.border },
    warning: { bg: COLORS.warning, text: COLORS.bg, border: COLORS.warning },
    outline: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary },
  };
  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 },
    lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
  };
  const vs = variantStyles[variant] || variantStyles.primary;
  const ss = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: vs.bg, borderColor: vs.border, paddingVertical: ss.paddingVertical, paddingHorizontal: ss.paddingHorizontal },
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={ss.fontSize + 2} color={vs.text} style={{ marginRight: 6 }} />}
          <Text style={[{ color: vs.text, fontSize: ss.fontSize, fontWeight: '600' }, textStyle]}>{title}</Text>
          {iconRight && <Ionicons name={iconRight} size={ss.fontSize + 2} color={vs.text} style={{ marginLeft: 6 }} />}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── INPUT ────────────────────────────────────────────────────
export const Input = ({
  label, value, onChangeText, placeholder, secureTextEntry,
  multiline, numberOfLines, keyboardType, error, icon, rightIcon,
  onRightIconPress, editable = true, style, inputStyle
}) => (
  <View style={[styles.inputWrapper, style]}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[styles.inputContainer, error && styles.inputError, !editable && styles.inputDisabled]}>
      {icon && <Ionicons name={icon} size={18} color={COLORS.textMuted} style={styles.inputIcon} />}
      <TextInput
        style={[styles.input, multiline && { height: numberOfLines * 22 + 20, textAlignVertical: 'top' }, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        editable={editable}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.inputRightIcon}>
          <Ionicons name={rightIcon} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ─── STATUS BADGE ─────────────────────────────────────────────
export const StatusBadge = ({ status, small }) => {
  const config = STATUS_CONFIG[status] || { color: COLORS.textMuted, label: status, icon: 'help-outline' };
  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.color + '22', borderColor: config.color + '55' },
      small && styles.badgeSmall
    ]}>
      <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
      <Text style={[styles.badgeText, { color: config.color }, small && { fontSize: 10 }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ─── ROLE BADGE ───────────────────────────────────────────────
export const RoleBadge = ({ role }) => {
  const config = ROLE_CONFIG[role] || { color: COLORS.textMuted, label: role };
  return (
    <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '55' }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color, style }) => (
  <View style={[styles.statCard, { borderColor: color + '33' }, style]}>
    <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── EMPTY STATE ──────────────────────────────────────────────
export const EmptyState = ({ icon = 'cube-outline', title, message, action, actionLabel }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={40} color={COLORS.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>{title || 'Nothing here'}</Text>
    {message && <Text style={styles.emptyMessage}>{message}</Text>}
    {action && (
      <Button title={actionLabel || 'Get Started'} onPress={action} style={{ marginTop: SPACING.lg }} />
    )}
  </View>
);

// ─── LOADING ──────────────────────────────────────────────────
export const Loading = ({ message }) => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    {message && <Text style={styles.loadingText}>{message}</Text>}
  </View>
);

// ─── DIVIDER ──────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ─── SECTION TITLE ────────────────────────────────────────────
export const SectionTitle = ({ title, action, actionLabel }) => (
  <View style={styles.sectionTitle}>
    <Text style={styles.sectionTitleText}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={action}>
        <Text style={styles.sectionTitleAction}>{actionLabel || 'See all'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── TAG ──────────────────────────────────────────────────────
export const Tag = ({ label, color, onRemove }) => (
  <View style={[styles.tag, { backgroundColor: (color || COLORS.primary) + '22', borderColor: (color || COLORS.primary) + '44' }]}>
    <View style={[styles.tagDot, { backgroundColor: color || COLORS.primary }]} />
    <Text style={[styles.tagText, { color: color || COLORS.primary }]}>{label}</Text>
    {onRemove && (
      <TouchableOpacity onPress={onRemove} style={{ marginLeft: 4 }}>
        <Ionicons name="close" size={12} color={color || COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── MODAL CONFIRM ────────────────────────────────────────────
export const InfoRow = ({ label, value, icon, valueStyle }) => (
  <View style={styles.infoRow}>
    {icon && <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />}
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueStyle]} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    marginRight: SPACING.sm,
    padding: 4,
  },
  headerRight: {
    padding: 8,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.sm,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  button: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  inputWrapper: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  inputRightIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    margin: 4,
    ...SHADOWS.card,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionTitleAction: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    margin: 3,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    flex: 2,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
  },
});
