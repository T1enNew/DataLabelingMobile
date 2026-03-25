// Design System: Industrial Precision meets Digital Craft
// Dark theme with electric accents — built for focus work

export const COLORS = {
  // Core backgrounds
  bg: '#0A0C10',
  bgCard: '#12151C',
  bgElevated: '#1A1E28',
  bgInput: '#1E2230',

  // Borders
  border: '#252A38',
  borderLight: '#2E3448',

  // Electric accent palette
  primary: '#4F8EF7',
  primaryDark: '#3A74E0',
  primaryGlow: 'rgba(79,142,247,0.15)',

  accent: '#00E5A0',
  accentDark: '#00C087',
  accentGlow: 'rgba(0,229,160,0.12)',

  warning: '#F7B731',
  warningGlow: 'rgba(247,183,49,0.12)',

  danger: '#FF4757',
  dangerGlow: 'rgba(255,71,87,0.12)',

  info: '#A78BFA',

  // Text hierarchy
  textPrimary: '#F0F2F8',
  textSecondary: '#8892A4',
  textMuted: '#4A5568',
  textInverse: '#0A0C10',

  // Status colors
  statusApproved: '#00E5A0',
  statusRejected: '#FF4757',
  statusSubmitted: '#F7B731',
  statusInProgress: '#4F8EF7',
  statusAssigned: '#A78BFA',
  statusDraft: '#8892A4',
  statusActive: '#00E5A0',
  statusCompleted: '#4F8EF7',
  statusArchived: '#4A5568',

  // Role colors
  roleAdmin: '#FF4757',
  roleManager: '#F7B731',
  roleAnnotator: '#4F8EF7',
  roleReviewer: '#00E5A0',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const FONTS = {
  // Using system fonts with custom weights for React Native
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  extrabold: { fontFamily: 'System', fontWeight: '800' },
  mono: { fontFamily: 'Courier New' },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  giant: 64,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  }),
};

export const STATUS_CONFIG = {
  assigned: { color: COLORS.statusAssigned, label: 'Assigned', icon: 'time-outline' },
  in_progress: { color: COLORS.statusInProgress, label: 'In Progress', icon: 'pencil-outline' },
  submitted: { color: COLORS.statusSubmitted, label: 'Submitted', icon: 'paper-plane-outline' },
  approved: { color: COLORS.statusApproved, label: 'Approved', icon: 'checkmark-circle-outline' },
  rejected: { color: COLORS.statusRejected, label: 'Rejected', icon: 'close-circle-outline' },
  revised: { color: COLORS.statusInProgress, label: 'Revised', icon: 'refresh-outline' },
  draft: { color: COLORS.statusDraft, label: 'Draft', icon: 'document-outline' },
  active: { color: COLORS.statusActive, label: 'Active', icon: 'play-circle-outline' },
  completed: { color: COLORS.statusCompleted, label: 'Completed', icon: 'checkmark-done-outline' },
  archived: { color: COLORS.statusArchived, label: 'Archived', icon: 'archive-outline' },
};

export const ROLE_CONFIG = {
  admin: { color: COLORS.roleAdmin, label: 'Admin', icon: 'shield-outline' },
  manager: { color: COLORS.roleManager, label: 'Manager', icon: 'briefcase-outline' },
  annotator: { color: COLORS.roleAnnotator, label: 'Annotator', icon: 'color-wand-outline' },
  reviewer: { color: COLORS.roleReviewer, label: 'Reviewer', icon: 'eye-outline' },
};
