import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { datasetsAPI, projectsAPI } from '../../services/api';
import { Screen, Header, Card, Input, Button, Loading } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ManagerUploadDatasetScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data)).finally(() => setLoadingProjects(false));
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newFiles = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/zip'],
      multiple: true,
    });
    if (!result.canceled) {
      const newFiles = result.assets.map(a => ({
        uri: a.uri,
        name: a.name,
        type: a.mimeType || 'application/octet-stream',
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (!selectedProject) return Alert.alert('Error', 'Please select a project');
    if (!name.trim()) return Alert.alert('Error', 'Dataset name is required');
    if (files.length === 0) return Alert.alert('Error', 'Please add at least one file');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('projectId', selectedProject._id);
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      files.forEach(f => fd.append('files', { uri: f.uri, name: f.name, type: f.type }));
      await datasetsAPI.upload(fd);
      Alert.alert('Success', `Dataset "${name}" uploaded with ${files.length} files!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProjects) return <Screen><Header title="Upload Dataset" onBack={() => navigation.goBack()} /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Upload Dataset" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Project Selection */}
        <Text style={styles.sectionLabel}>SELECT PROJECT *</Text>
        <View style={styles.projectList}>
          {projects.map(p => (
            <TouchableOpacity
              key={p._id}
              style={[styles.projectOption, selectedProject?._id === p._id && styles.projectOptionActive]}
              onPress={() => setSelectedProject(p)}
            >
              <View style={[styles.projectRadio, selectedProject?._id === p._id && styles.projectRadioActive]}>
                {selectedProject?._id === p._id && <View style={styles.projectRadioDot} />}
              </View>
              <View>
                <Text style={[styles.projectOptionName, selectedProject?._id === p._id && { color: COLORS.primary }]}>
                  {p.name}
                </Text>
                <Text style={styles.projectOptionStatus}>{p.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dataset Info */}
        <Text style={styles.sectionLabel}>DATASET INFO</Text>
        <Card>
          <Input label="Dataset Name *" value={name} onChangeText={setName}
            placeholder="e.g. Batch 1 - Street Images" icon="server-outline" />
          <Input label="Description" value={description} onChangeText={setDescription}
            placeholder="Optional description..." multiline numberOfLines={2} icon="document-text-outline" />
        </Card>

        {/* File Upload */}
        <Text style={styles.sectionLabel}>FILES ({files.length})</Text>
        <Card>
          <View style={styles.uploadBtns}>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
              <Ionicons name="images-outline" size={28} color={COLORS.primary} />
              <Text style={styles.uploadBtnTitle}>Images</Text>
              <Text style={styles.uploadBtnSub}>JPG, PNG, GIF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickDocuments}>
              <Ionicons name="folder-open-outline" size={28} color={COLORS.accent} />
              <Text style={[styles.uploadBtnTitle, { color: COLORS.accent }]}>Files / ZIP</Text>
              <Text style={styles.uploadBtnSub}>Any format</Text>
            </TouchableOpacity>
          </View>

          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.slice(0, 5).map((f, i) => (
                <View key={i} style={styles.fileRow}>
                  <Ionicons name="document-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => removeFile(i)}>
                    <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              {files.length > 5 && (
                <Text style={styles.moreFiles}>+{files.length - 5} more files</Text>
              )}
            </View>
          )}
        </Card>

        <Button
          title={loading ? 'Uploading...' : `Upload ${files.length} Files`}
          onPress={handleUpload}
          loading={loading}
          size="lg"
          icon="cloud-upload-outline"
          disabled={!selectedProject || !name || files.length === 0}
          style={{ marginBottom: 100 }}
        />
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
  projectList: { gap: SPACING.sm, marginBottom: SPACING.md },
  projectOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  projectOptionActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  projectRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  projectRadioActive: { borderColor: COLORS.primary },
  projectRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  projectOptionName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  projectOptionStatus: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  uploadBtns: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  uploadBtn: {
    flex: 1, alignItems: 'center', padding: SPACING.xl,
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  uploadBtnTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.sm },
  uploadBtnSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  fileList: { gap: SPACING.xs },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  fileName: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  moreFiles: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingTop: SPACING.sm },
});
