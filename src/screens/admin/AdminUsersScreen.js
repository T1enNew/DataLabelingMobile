import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../services/api';
import { Screen, Header, Card, Button, RoleBadge, EmptyState, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS, ROLE_CONFIG } from '../../theme';

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
      applyFilter(res.data, search, roleFilter);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const applyFilter = (data, q, role) => {
    let result = data;
    if (role !== 'all') result = result.filter(u => u.role === role);
    if (q) result = result.filter(u =>
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.fullName.toLowerCase().includes(q.toLowerCase())
    );
    setFiltered(result);
  };

  useEffect(() => { applyFilter(users, search, roleFilter); }, [search, roleFilter, users]);

  const handleToggleActive = (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} ${user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await usersAPI.update(user._id, { isActive: !user.isActive });
              loadUsers();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.fullName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersAPI.delete(user._id);
              loadUsers();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const ROLES = ['all', 'admin', 'manager', 'annotator', 'reviewer'];

  const renderUser = ({ item }) => (
    <Card style={styles.userCard}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: (ROLE_CONFIG[item.role]?.color || COLORS.primary) + '22' }]}>
          <Text style={[styles.avatarText, { color: ROLE_CONFIG[item.role]?.color || COLORS.primary }]}>
            {item.fullName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.fullName}</Text>
            {!item.isActive && (
              <View style={styles.inactiveTag}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <RoleBadge role={item.role} />
            <Text style={styles.userSince}>Joined {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AdminEditUser', { user: item })}
        >
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
          <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons
            name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={item.isActive ? COLORS.warning : COLORS.accent}
          />
          <Text style={[styles.actionText, { color: item.isActive ? COLORS.warning : COLORS.accent }]}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <Screen><Header title="Users" /><Loading /></Screen>;

  return (
    <Screen>
      <Header
        title="Users"
        subtitle={`${filtered.length} of ${users.length} users`}
        rightAction={() => navigation.navigate('AdminCreateUser')}
        rightIcon="person-add-outline"
      />
      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.roleFilters}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleFilterBtn,
                roleFilter === r && { backgroundColor: (ROLE_CONFIG[r]?.color || COLORS.primary) + '22', borderColor: ROLE_CONFIG[r]?.color || COLORS.primary }
              ]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[
                styles.roleFilterText,
                roleFilter === r && { color: ROLE_CONFIG[r]?.color || COLORS.primary }
              ]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderUser}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No users found"
            message="Try adjusting your search or filters"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  roleFilters: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  roleFilterBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  roleFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  userCard: {
    marginBottom: SPACING.md,
  },
  userRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: { flex: 1 },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inactiveTag: {
    backgroundColor: COLORS.dangerGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  inactiveText: {
    fontSize: 10,
    color: COLORS.danger,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  userSince: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
