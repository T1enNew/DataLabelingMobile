import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity,
  TextInput, Image, Modal, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Circle } from 'react-native-svg';
import axios from 'axios';
import { tasksAPI, reviewsAPI, BASE_URL } from '../../services/api';
import { Audio } from 'expo-av';
import { Screen, Header, Card, Button, Tag, Loading, StatusBadge, InfoRow } from '../../components/UI';
import { COLORS, SPACING, RADIUS } from '../../theme';

const ERROR_CATEGORIES = [
  { value: 'incorrect_label', label: 'Incorrect Label' },
  { value: 'missing_label', label: 'Missing Label' },
  { value: 'poor_quality', label: 'Poor Quality' },
  { value: 'does_not_follow_guidelines', label: 'Does Not Follow Guidelines' },
  { value: 'other', label: 'Other' },
];

export default function ReviewerTaskScreen({ navigation, route }) {
  const { taskId, mode, annotatorIds } = route.params;
  const allowedAnnotatorIds = useMemo(() => (
    annotatorIds
      ? annotatorIds.split(',').map((id) => id.trim()).filter(Boolean)
      : null
  ), [annotatorIds]);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]);
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [annotatorVisibility, setAnnotatorVisibility] = useState({});
  const [activeAnnotatorId, setActiveAnnotatorId] = useState('');
  const [showAnnotatorLabels, setShowAnnotatorLabels] = useState(false);
  const [showTextLabels, setShowTextLabels] = useState(true);
  const [splitView, setSplitView] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [errorCategory, setErrorCategory] = useState('other');
  const [reviewNotes, setReviewNotes] = useState([]);
  const [addingNote, setAddingNote] = useState(null); // { x, y }
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [selectedTextSpanNote, setSelectedTextSpanNote] = useState(null); // { annotatorName, label, text }
  const [selectedAudioSegmentNote, setSelectedAudioSegmentNote] = useState(null); // { annotatorId, annotatorName, label, start, end }
  const [noteText, setNoteText] = useState('');
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [primaryQueued, setPrimaryQueued] = useState(false);
  const [infoAnnotatorId, setInfoAnnotatorId] = useState('');
  const SCREEN_W = Dimensions.get('window').width - SPACING.lg * 2;
  const [imgSize, setImgSize] = useState({ width: SCREEN_W, height: 250 });
  const [imgMeta, setImgMeta] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: SCREEN_W, height: 250 });
  const [audioWaveWidth, setAudioWaveWidth] = useState(Math.max(220, SCREEN_W - 24));
  const audioSoundRef = useRef(null);
  const [playingSegKey, setPlayingSegKey] = useState('');

  const textSpanKey = useCallback((span) => {
    if (!span) return '';
    const annotatorName = String(span.annotatorName || '').trim();
    const label = String(span.label || '').trim();
    const text = String(span.text || '').trim();
    return `${annotatorName}|||${label}|||${text}`;
  }, []);

  const parsedTextNote = useCallback((note) => {
    // Supports both new structured notes + legacy `[TEXT] ...` encoded notes
    if (!note) return null;
    if (note?.type === 'text' && note?.textSpan) {
      return {
        annotatorName: note.textSpan.annotatorName || 'Annotator',
        label: note.textSpan.label || 'Unknown',
        text: note.textSpan.text || '—',
        commentOnly: String(note.commentOnly ?? note.note ?? '').trim(),
      };
    }
    const raw = typeof note.comment === 'string' ? note.comment : '';
    if (!raw.startsWith('[TEXT]')) return null;
    const lines = raw.split('\n');
    const first = lines[0] || '';
    const metaPart = first.replace('[TEXT] ', '');
    const [meta = '', textPart = ''] = metaPart.split(': ');
    const [annotatorName = 'Annotator', label = 'Unknown'] = meta.split(' • ');
    const commentOnly = lines.slice(1).join('\n').trim();
    return { annotatorName, label, text: textPart || '—', commentOnly };
  }, []);

  const textNotesBySpanKey = useMemo(() => {
    const map = new Map();
    (reviewNotes || []).forEach((n, idx) => {
      const parsed = parsedTextNote(n);
      if (!parsed) return;
      const key = textSpanKey(parsed);
      if (!key) return;
      // Keep the most recent note for this span
      map.set(key, { idx, ...parsed });
    });
    return map;
  }, [parsedTextNote, reviewNotes, textSpanKey]);

  const audioSegmentKey = useCallback((seg) => {
    if (!seg) return '';
    const annotatorId = String(seg.annotatorId || '').trim();
    const annotatorName = String(seg.annotatorName || '').trim();
    const label = String(seg.label || '').trim();
    const start = Number(seg.start ?? seg.startTime ?? 0);
    const end = Number(seg.end ?? seg.endTime ?? 0);
    return `${annotatorId}|||${annotatorName}|||${label}|||${start}|||${end}`;
  }, []);

  const parsedAudioNote = useCallback((note) => {
    // Supports both new structured notes + legacy `[AUDIO] ...` encoded notes
    if (!note) return null;
    if (note?.type === 'audio' && note?.audioSegment) {
      return {
        annotatorId: note.audioSegment.annotatorId || '',
        annotatorName: note.audioSegment.annotatorName || 'Annotator',
        label: note.audioSegment.label || 'Unknown',
        start: Number(note.audioSegment.start ?? 0),
        end: Number(note.audioSegment.end ?? 0),
        commentOnly: String(note.commentOnly ?? note.note ?? '').trim(),
      };
    }
    const raw = typeof note.comment === 'string' ? note.comment : '';
    if (!raw.startsWith('[AUDIO]')) return null;
    const lines = raw.split('\n');
    const first = lines[0] || '';
    const metaPart = first.replace('[AUDIO] ', '');
    // Expected: "AnnotatorName • Label • start-end"
    const parts = metaPart.split(' • ');
    const annotatorName = parts[0] || 'Annotator';
    const label = parts[1] || 'Unknown';
    const range = parts[2] || '0-0';
    const [startStr = '0', endStr = '0'] = String(range).split('-');
    const start = Number(startStr);
    const end = Number(endStr);
    const commentOnly = lines.slice(1).join('\n').trim();
    return { annotatorId: '', annotatorName, label, start, end, commentOnly };
  }, []);

  const audioNotesBySegmentKey = useMemo(() => {
    const map = new Map();
    (reviewNotes || []).forEach((n, idx) => {
      const parsed = parsedAudioNote(n);
      if (!parsed) return;
      const key = audioSegmentKey(parsed);
      if (!key) return;
      map.set(key, { idx, ...parsed });
    });
    return map;
  }, [audioSegmentKey, parsedAudioNote, reviewNotes]);

  const beginTextSpanNote = useCallback((span) => {
    if (!span) return;
    const key = textSpanKey(span);
    const existing = key ? textNotesBySpanKey.get(key) : null;
    setSelectedTextSpanNote(span);
    setSelectedAudioSegmentNote(null);
    setAddingNote(null);
    setEditingNoteIndex(existing ? existing.idx : null);
    setNoteText(existing ? existing.commentOnly : '');
  }, [textNotesBySpanKey, textSpanKey]);

  const beginAudioSegmentNote = useCallback((seg) => {
    if (!seg) return;
    const key = audioSegmentKey(seg);
    const existing = key ? audioNotesBySegmentKey.get(key) : null;
    setSelectedAudioSegmentNote(seg);
    setSelectedTextSpanNote(null);
    setAddingNote(null);
    setEditingNoteIndex(existing ? existing.idx : null);
    setNoteText(existing ? existing.commentOnly : '');
  }, [audioNotesBySegmentKey, audioSegmentKey]);

  const loadTaskData = useCallback(async ({ preserveLoading = false } = {}) => {
    if (!preserveLoading) setLoading(true);
    try {
      const [taskRes, relatedRes] = await Promise.all([
        tasksAPI.getById(taskId),
        tasksAPI.getRelated(taskId),
      ]);

      setTask(taskRes.data);
      setPrimaryQueued(false);
      const tasks = Array.isArray(relatedRes?.data) ? relatedRes.data : [];
      setRelatedTasks(tasks);

      const visibility = {};
      tasks.forEach((t) => {
        const aid = t?.annotatorId?._id || t?.annotatorId;
        if (aid) visibility[aid] = true;
      });

      if (allowedAnnotatorIds && allowedAnnotatorIds.length > 0) {
        Object.keys(visibility).forEach((aid) => {
          visibility[aid] = allowedAnnotatorIds.includes(aid);
        });
        setAnnotatorVisibility(visibility);
        if (allowedAnnotatorIds.length === 1) {
          setActiveAnnotatorId(allowedAnnotatorIds[0]);
        } else if (allowedAnnotatorIds.length > 1) {
          setActiveAnnotatorId('');
        }
        setShowAnnotatorLabels(true);
      } else {
        setAnnotatorVisibility(visibility);
        if (tasks.length === 1) {
          const onlyId = tasks[0]?.annotatorId?._id || tasks[0]?.annotatorId || '';
          setActiveAnnotatorId(onlyId);
        }
      }

      if (!preserveLoading) setLoading(false);

      const projectId = taskRes.data?.projectId?._id || taskRes.data?.projectId;
      if (projectId) {
        reviewsAPI.getAll().then((res) => {
          const pending = Array.isArray(res?.data?.pending) ? res.data.pending : [];
          const reviewed = Array.isArray(res?.data?.reviewed) ? res.data.reviewed : [];
          const all = [...pending, ...reviewed];
          const scoped = all.filter((t) => {
            const pid = t?.projectId?._id || t?.projectId;
            return pid?.toString?.() === projectId?.toString?.();
          });
          setProjectTasks(scoped);
        }).catch(() => {});
      }

      return { task: taskRes.data, related: tasks };
    } catch (e) {
      if (!preserveLoading) setLoading(false);
      Alert.alert('Error', e.message);
      return { task: null, related: [] };
    }
  }, [taskId, allowedAnnotatorIds]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  const [resolvedTextContent, setResolvedTextContent] = useState('');

  const buildFileUrl = (dataItem) => {
    if (!dataItem) return '';
    const base = BASE_URL.replace(/\/+$/, '');
    if (dataItem.imageUrl) {
      const cleanImageUrl = String(dataItem.imageUrl).replace(/^\/+/, '');
      return `${base}/${cleanImageUrl}`;
    }
    if (dataItem.audioUrl) {
      const cleanAudioUrl = String(dataItem.audioUrl).replace(/^\/+/, '');
      return `${base}/${cleanAudioUrl}`;
    }
    const rawPath = dataItem.path || '';
    const cleanPath = String(rawPath).replace(/^\/+/, '');
    if (cleanPath) {
      if (dataItem.filename && cleanPath.endsWith(dataItem.filename)) {
        return `${base}/${cleanPath}`;
      }
      return dataItem.filename ? `${base}/${cleanPath}/${dataItem.filename}` : `${base}/${cleanPath}`;
    }
    return dataItem.filename ? `${base}/uploads/datasets/${dataItem.filename}` : '';
  };

  const imageUrl = buildFileUrl(task?.dataItem);
  const labels = task?.projectId?.labelSet || [];
  const annotatorName = task?.annotatorId?.fullName || task?.annotatorId?.username || 'Annotator';

  const mimeType = task?.dataItem?.mimeType || '';
  const datasetType = mimeType.startsWith('image/')
    ? 'image'
    : mimeType.startsWith('audio/')
      ? 'audio'
      : (mimeType.startsWith('text/') || task?.dataItem?.text || task?.dataItem?.content)
        ? 'text'
        : 'image';

  const stopAudioSegment = useCallback(async () => {
    try {
      if (audioSoundRef.current) {
        await audioSoundRef.current.stopAsync();
        await audioSoundRef.current.unloadAsync();
        audioSoundRef.current = null;
      }
    } catch (_) {}
    setPlayingSegKey('');
  }, []);

  const playAudioSegment = useCallback(async (segment, segKey) => {
    if (!imageUrl || datasetType !== 'audio') return;

    const start = Number(segment?.start ?? segment?.startTime ?? 0);
    const end = Number(segment?.end ?? segment?.endTime ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

    try {
      await stopAudioSegment();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: imageUrl },
        { shouldPlay: false }
      );
      audioSoundRef.current = sound;
      setPlayingSegKey(segKey);

      const startMs = Math.max(0, Math.floor(start * 1000));
      const endMs = Math.max(startMs + 100, Math.floor(end * 1000));
      await sound.setPositionAsync(startMs);
      await sound.playAsync();

      setTimeout(async () => {
        try {
          const current = audioSoundRef.current;
          if (current) {
            const status = await current.getStatusAsync();
            if (status?.isLoaded && status.positionMillis >= endMs - 120) {
              await stopAudioSegment();
            } else if (status?.isLoaded) {
              await current.setPositionAsync(endMs);
              await stopAudioSegment();
            }
          }
        } catch (_) {
          await stopAudioSegment();
        }
      }, Math.max(120, endMs - startMs));
    } catch (e) {
      setPlayingSegKey('');
      Alert.alert('Audio error', 'Không thể phát đoạn âm thanh này.');
    }
  }, [datasetType, imageUrl, stopAudioSegment]);

  const playFullAudio = useCallback(async () => {
    if (!imageUrl || datasetType !== 'audio') return;
    try {
      await stopAudioSegment();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: imageUrl },
        { shouldPlay: true }
      );
      audioSoundRef.current = sound;
      setPlayingSegKey('__full__');
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          stopAudioSegment();
        }
      });
    } catch (e) {
      Alert.alert('Audio error', 'Không thể phát file audio gốc.');
      setPlayingSegKey('');
    }
  }, [datasetType, imageUrl, stopAudioSegment]);

  useEffect(() => {
    return () => {
      stopAudioSegment();
    };
  }, [stopAudioSegment]);

  const hiddenAnnotatorIds = new Set(
    relatedTasks
      .filter((t) => ['approved', 'rejected'].includes(t?.status))
      .map((t) => t?.annotatorId?._id || t?.annotatorId)
      .filter(Boolean)
  );

  const selectableRelatedTasks = relatedTasks.length > 0
    ? relatedTasks.filter((t) => {
      if (['approved', 'rejected'].includes(t?.status)) return false;
      const aid = t?.annotatorId?._id || t?.annotatorId;
      if (aid && hiddenAnnotatorIds.has(aid)) return false;
      if (!allowedAnnotatorIds || allowedAnnotatorIds.length === 0) return true;
      return aid ? allowedAnnotatorIds.includes(aid) : false;
    })
    : [];

  const visibleRelatedTasks = selectableRelatedTasks.filter((t) => {
    const aid = t?.annotatorId?._id || t?.annotatorId;
    return aid ? annotatorVisibility[aid] !== false : true;
  });

  const combinedAnnotations = showAnnotatorLabels
    ? (
      selectableRelatedTasks.length > 0
        ? visibleRelatedTasks.flatMap((t, tIdx) => {
          const aid = t?.annotatorId?._id || t?.annotatorId || `ann_${tIdx}`;
          const labelSet = t?.projectId?.labelSet || labels || [];
          const defaultColor = labelSet.find((l) => l?.name)?.color;
          const name = t?.annotatorId?.fullName || t?.annotatorId?.username || 'Annotator';
          return (t?.labels?.objects || []).map((obj, idx) => ({
            id: `${aid}_${idx}`,
            bbox: obj.bbox,
            label: `${obj.label || 'Unknown'} • ${name}`,
            rawLabel: obj.label,
            annotatorId: aid,
            color: defaultColor,
          }));
        })
        : (task?.labels?.objects || []).map((obj, idx) => ({
          id: `self_${idx}`,
          bbox: obj.bbox,
          label: `${obj.label || 'Unknown'} • ${annotatorName}`,
          rawLabel: obj.label,
          annotatorId: task?.annotatorId?._id || task?.annotatorId || 'self',
        }))
    )
    : [];

  const annotations = showAnnotatorLabels
    ? combinedAnnotations
    : (task?.labels?.objects || []);

  const textAnnotatorTasks = visibleRelatedTasks.filter((t) => {
    if (!showAnnotatorLabels) return false;
    const aid = t?.annotatorId?._id || t?.annotatorId;
    if (!aid) return false;
    if (!activeAnnotatorId || activeAnnotatorId === 'all') return true;
    return aid === activeAnnotatorId;
  });

  const textAnnotatorStats = selectableRelatedTasks
    .map((t, tIdx) => {
      const aid = t?.annotatorId?._id || t?.annotatorId || `ann_${tIdx}`;
      const name = t?.annotatorId?.fullName || t?.annotatorId?.username || `Annotator ${tIdx + 1}`;
      const spans = t?.labels?.spans || t?.labels?.sentences || [];
      return { aid, name, count: spans.length, spans };
    })
    .filter((x) => !!x.aid);

  const visibleTextAnnotatorStats = textAnnotatorStats.filter((a) => annotatorVisibility[a.aid] !== false);

  const normalizedSpansByAnnotator = useMemo(() => {
    const map = {};
    visibleTextAnnotatorStats.forEach((ann) => {
      map[ann.aid] = (ann.spans || []).map((span, idx) => ({
        id: `${ann.aid}_${idx}`,
        label: span?.label || 'Unknown',
        text: span?.text || span?.sentence || '',
        start: typeof span?.start === 'number' ? span.start : -1,
        end: typeof span?.end === 'number' ? span.end : -1,
      }));
    });
    return map;
  }, [visibleTextAnnotatorStats]);


  const baseTextSpans = task?.labels?.spans || task?.labels?.sentences || [];
  const textSpans = showAnnotatorLabels
    ? textAnnotatorTasks.flatMap((t, tIdx) => {
      const aid = t?.annotatorId?._id || t?.annotatorId || `ann_${tIdx}`;
      const name = t?.annotatorId?.fullName || t?.annotatorId?.username || 'Annotator';
      const spans = t?.labels?.spans || t?.labels?.sentences || [];
      return spans.map((span, idx) => ({
        ...span,
        _id: `${aid}_${idx}`,
        annotatorId: aid,
        annotatorName: name,
      }));
    })
    : baseTextSpans;

  const audioAnnotatorTasks = visibleRelatedTasks.filter((t) => {
    if (!showAnnotatorLabels) return false;
    const aid = t?.annotatorId?._id || t?.annotatorId;
    if (!aid) return false;
    if (!activeAnnotatorId || activeAnnotatorId === 'all') return true;
    return aid === activeAnnotatorId;
  });

  const audioAnnotatorStats = selectableRelatedTasks
    .map((t, tIdx) => {
      const aid = t?.annotatorId?._id || t?.annotatorId || `ann_${tIdx}`;
      const name = t?.annotatorId?.fullName || t?.annotatorId?.username || `Annotator ${tIdx + 1}`;
      const segments = t?.labels?.segments || [];
      return { aid, name, count: segments.length, segments };
    })
    .filter((x) => !!x.aid);

  const visibleAudioAnnotatorStats = audioAnnotatorStats.filter((a) => annotatorVisibility[a.aid] !== false);

  const baseAudioSegments = task?.labels?.segments || [];
  const audioSegments = showAnnotatorLabels
    ? audioAnnotatorTasks.flatMap((t, tIdx) => {
      const aid = t?.annotatorId?._id || t?.annotatorId || `ann_${tIdx}`;
      const name = t?.annotatorId?.fullName || t?.annotatorId?.username || 'Annotator';
      const segments = t?.labels?.segments || [];
      return segments.map((seg, idx) => ({
        ...seg,
        _id: `${aid}_${idx}`,
        annotatorId: aid,
        annotatorName: name,
      }));
    })
    : baseAudioSegments;

  const audioDuration = useMemo(() => {
    const ends = audioSegments
      .map((seg) => Number(seg?.end ?? seg?.endTime ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    return ends.length > 0 ? Math.max(...ends) : 0;
  }, [audioSegments]);

  const audioWaveBars = useMemo(() => {
    const barCount = 72;
    const seedBase = `${task?.dataItem?.filename || ''}-${audioDuration}`;
    let hash = 0;
    for (let i = 0; i < seedBase.length; i += 1) {
      hash = ((hash << 5) - hash + seedBase.charCodeAt(i)) | 0;
    }
    const bars = [];
    for (let i = 0; i < barCount; i += 1) {
      const wave = Math.abs(Math.sin((i + 1) * 0.45 + hash * 0.001));
      const noise = Math.abs(Math.sin((i + 1) * 1.77 + hash * 0.003));
      const amp = Math.min(1, 0.2 + wave * 0.55 + noise * 0.25);
      bars.push(amp);
    }
    return bars;
  }, [task?.dataItem?.filename, audioDuration]);

  const summaryItems = datasetType === 'image'
    ? annotations
    : datasetType === 'text'
      ? textSpans
      : audioSegments;

  const textContent = resolvedTextContent || task?.dataItem?.text || task?.dataItem?.content || '';

  const getHighlightedTextParts = () => {
    if (!textContent || textSpans.length === 0) {
      return [{ type: 'plain', text: textContent || 'No text content' }];
    }

    const normalized = textSpans
      .map((span, idx) => ({
        idx,
        label: span?.label || 'Unknown',
        text: span?.text || span?.sentence || '',
        start: typeof span?.start === 'number' ? span.start : null,
        end: typeof span?.end === 'number' ? span.end : null,
        annotatorName: span?.annotatorName || '',
      }))
      .filter((span) => !!span.text)
      .sort((a, b) => {
        const aStart = a.start ?? Number.MAX_SAFE_INTEGER;
        const bStart = b.start ?? Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      });

    const parts = [];
    let cursor = 0;
    const usedRanges = new Set();

    normalized.forEach((span) => {
      let start = span.start;
      let end = span.end;

      if (start === null || end === null || end <= start) {
        const foundAt = textContent.indexOf(span.text, cursor);
        if (foundAt === -1) return;
        start = foundAt;
        end = foundAt + span.text.length;
      }

      const rangeKey = `${start}-${end}-${span.label}`;
      if (usedRanges.has(rangeKey)) return;
      usedRanges.add(rangeKey);

      if (end <= cursor) return;
      if (start < cursor) start = cursor;

      if (start > cursor) {
        parts.push({ type: 'plain', text: textContent.slice(cursor, start) });
      }

      parts.push({
        type: 'label',
        text: textContent.slice(start, end),
        label: span.label,
        annotatorName: span.annotatorName,
      });

      cursor = Math.max(cursor, end);
    });

    if (cursor < textContent.length) {
      parts.push({ type: 'plain', text: textContent.slice(cursor) });
    }

    return parts.length > 0 ? parts : [{ type: 'plain', text: textContent }];
  };

  const uniqueProjectItems = useMemo(() => {
    const tasks = Array.isArray(projectTasks) ? projectTasks : [];
    const byKey = new Map();

    tasks.forEach((t) => {
      const key = t?.dataItem?.path || t?.dataItem?.filename || t?._id;
      if (!key) return;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(t);
    });

    const isAllowedAnnotator = (t) => {
      if (!allowedAnnotatorIds || allowedAnnotatorIds.length === 0) return true;
      const aid = t?.annotatorId?._id || t?.annotatorId;
      return !!aid && allowedAnnotatorIds.includes(String(aid));
    };

    const items = [];
    byKey.forEach((group, key) => {
      const remainingSubmitted = group.some((t) => t?.status === 'submitted' && isAllowedAnnotator(t));
      // Hide items that have no remaining annotator work (after reviewer finished)
      if (!remainingSubmitted) return;

      const first = group[0];
      const itemMime = first?.dataItem?.mimeType || '';
      const itemType = itemMime.startsWith('image/')
        ? 'image'
        : itemMime.startsWith('audio/')
          ? 'audio'
          : (itemMime.startsWith('text/') || first?.dataItem?.text || first?.dataItem?.content)
            ? 'text'
            : 'image';

      // Prefer navigating to a still-submitted taskId for this item
      const submittedTask = group.find((t) => t?.status === 'submitted' && isAllowedAnnotator(t));
      const navTaskId = submittedTask?._id || first?._id;

      items.push({
        key,
        taskId: navTaskId,
        status: submittedTask?.status || first?.status,
        type: itemType,
        thumb: itemType === 'image' && first?.dataItem?.path ? `${BASE_URL}/${first.dataItem.path}` : null,
      });
    });

    return items;
  }, [allowedAnnotatorIds, projectTasks]);

  const submittedRelatedTasks = selectableRelatedTasks.filter((t) => t?.status === 'submitted');

  const selectedActionAnnotatorId = infoAnnotatorId
    || activeAnnotatorId
    || (submittedRelatedTasks[0]?.annotatorId?._id || submittedRelatedTasks[0]?.annotatorId)
    || (allowedAnnotatorIds && allowedAnnotatorIds.length > 0 ? allowedAnnotatorIds[0] : (task?.annotatorId?._id || task?.annotatorId || ''));

  const selectedActionTask = relatedTasks.find((t) => {
    const aid = t?.annotatorId?._id || t?.annotatorId;
    return selectedActionAnnotatorId && aid?.toString?.() === selectedActionAnnotatorId?.toString?.();
  });

  const actionTaskId = selectedActionTask?._id || taskId;
  const selectedActionStatus = selectedActionTask?.status || task?.status;
  const canScoreSelectedTask = selectedActionStatus === 'submitted';
  const selectedActionAnnotatorName = selectedActionTask?.annotatorId?.fullName
    || selectedActionTask?.annotatorId?.username
    || task?.annotatorId?.fullName
    || task?.annotatorId?.username
    || 'annotator';

  const primaryAlreadySetForItem = useMemo(() => {
    if (task?.primaryForItem) return true;
    if (selectedActionTask?.primaryForItem) return true;
    return (Array.isArray(relatedTasks) ? relatedTasks : []).some((t) => !!t?.primaryForItem);
  }, [relatedTasks, selectedActionTask?.primaryForItem, task?.primaryForItem]);

  const pickNextSubmittedAnnotatorId = useCallback((tasks, excludeAnnotatorId) => {
    const list = Array.isArray(tasks) ? tasks : [];
    const exclude = excludeAnnotatorId ? String(excludeAnnotatorId) : '';
    const allowed = Array.isArray(allowedAnnotatorIds) && allowedAnnotatorIds.length > 0
      ? new Set(allowedAnnotatorIds.map((x) => String(x)))
      : null;

    const remaining = list.filter((t) => {
      if (t?.status !== 'submitted') return false;
      const aid = t?.annotatorId?._id || t?.annotatorId;
      if (!aid) return false;
      const aidStr = String(aid);
      if (exclude && aidStr === exclude) return false;
      if (allowed && !allowed.has(aidStr)) return false;
      return true;
    });

    const nextId = remaining[0]?.annotatorId?._id || remaining[0]?.annotatorId;
    return nextId ? String(nextId) : '';
  }, [allowedAnnotatorIds]);

  const handleApprove = async () => {
    if (!canScoreSelectedTask) {
      Alert.alert('Cannot score', `Task của ${selectedActionAnnotatorName} không ở trạng thái submitted.`);
      return;
    }

    Alert.alert('Approve Task', `Mark task of ${selectedActionAnnotatorName} as approved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setApproving(true);
          try {
            await reviewsAPI.approve(actionTaskId, { reviewNotes });
            if (primaryQueued) {
              try {
                await reviewsAPI.primary(actionTaskId);
                setTask(prev => prev ? { ...prev, primaryForItem: true } : prev);
                setRelatedTasks((prev) => (Array.isArray(prev)
                  ? prev.map((t) => (t?._id === actionTaskId ? { ...t, primaryForItem: true } : t))
                  : prev));
              } catch (e) {
                Alert.alert('Approved', 'Task approved but failed to set primary. Please try again.');
              }
            }
            setReviewNotes([]);
            setSelectedTextSpanNote(null);
            setNoteText('');
            const { related } = await loadTaskData({ preserveLoading: true }) || {};
            const latestRelated = Array.isArray(related) ? related : [];
            const nextId = pickNextSubmittedAnnotatorId(latestRelated, selectedActionAnnotatorId);
            if (nextId) {
              setInfoAnnotatorId(nextId);
              setActiveAnnotatorId(nextId);
            } else {
              // No more annotators to score for this item
              setInfoAnnotatorId('');
              setActiveAnnotatorId('all');
            }
            Alert.alert('Approved!', 'Task has been approved.');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setApproving(false);
          }
        }
      }
    ]);
  };

  const handleReject = async () => {
    if (!canScoreSelectedTask) {
      Alert.alert('Cannot score', `Task của ${selectedActionAnnotatorName} không ở trạng thái submitted.`);
      return;
    }

    if (!rejectComment.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }
    if (reviewNotes.length === 0) {
      Alert.alert('Required', 'Please add at least one feedback note (image / text span / audio segment).');
      return;
    }
    setRejecting(true);
    try {
      await reviewsAPI.reject(actionTaskId, {
        reviewComments: rejectComment.trim(),
        errorCategory,
        reviewNotes,
      });
      setShowRejectModal(false);
      setReviewNotes([]);
      setSelectedTextSpanNote(null);
      setNoteText('');
      setRejectComment('');
      const { related } = await loadTaskData({ preserveLoading: true }) || {};
      const latestRelated = Array.isArray(related) ? related : [];
      const nextId = pickNextSubmittedAnnotatorId(latestRelated, selectedActionAnnotatorId);
      if (nextId) {
        setInfoAnnotatorId(nextId);
        setActiveAnnotatorId(nextId);
      } else {
        setInfoAnnotatorId('');
        setActiveAnnotatorId('all');
      }
      Alert.alert('Rejected', 'Task has been rejected with feedback.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleSetPrimary = async () => {
    if (primaryAlreadySetForItem) {
      Alert.alert('Primary already set', 'This item already has a primary. You can only set primary once per item.');
      return;
    }
    if (!canScoreSelectedTask) {
      Alert.alert('Cannot set primary', 'You can only set primary while this annotator task is still submitted (before approve/reject).');
      return;
    }
    if (!isApproved) {
      setPrimaryQueued((prev) => !prev);
      return;
    }
    Alert.alert('Set Primary', 'Set this annotator output as primary for this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set Primary',
        onPress: async () => {
          setSettingPrimary(true);
          try {
            await reviewsAPI.primary(actionTaskId);
            setTask(prev => prev ? { ...prev, primaryForItem: true } : prev);
            setRelatedTasks((prev) => (Array.isArray(prev)
              ? prev.map((t) => (t?._id === actionTaskId ? { ...t, primaryForItem: true } : t))
              : prev));
            Alert.alert('Success', 'Primary image has been set.');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setSettingPrimary(false);
          }
        }
      }
    ]);
  };

  const handleImageTap = (evt) => {
    if (mode !== 'review') return;
    const { locationX, locationY } = evt.nativeEvent;
    setAddingNote({ x: locationX, y: locationY });
    setNoteText('');
  };

  const addNote = () => {
    if (!noteText.trim()) return;

    if (selectedTextSpanNote) {
      const meta = `${selectedTextSpanNote.annotatorName || 'Annotator'} • ${selectedTextSpanNote.label || 'Unknown'}`;
      const spanPayload = {
        annotatorName: selectedTextSpanNote.annotatorName || 'Annotator',
        label: selectedTextSpanNote.label || 'Unknown',
        text: selectedTextSpanNote.text || '—',
      };
      if (editingNoteIndex !== null) {
        setReviewNotes(prev => prev.map((n, i) => (i === editingNoteIndex
          ? {
            ...n,
            type: 'text',
            textSpan: spanPayload,
            commentOnly: noteText.trim(),
            comment: `[TEXT] ${meta}: ${selectedTextSpanNote.text || '—'}\n${noteText.trim()}`,
            label: selectedTextSpanNote.label || null,
          }
          : n)));
      } else {
        setReviewNotes(prev => [...prev, {
          bbox: [0, 0, 0, 0],
          type: 'text',
          textSpan: spanPayload,
          commentOnly: noteText.trim(),
          comment: `[TEXT] ${meta}: ${selectedTextSpanNote.text || '—'}\n${noteText.trim()}`,
          label: selectedTextSpanNote.label || null,
        }]);
      }
      setSelectedTextSpanNote(null);
      setEditingNoteIndex(null);
      setNoteText('');
      return;
    }

    if (selectedAudioSegmentNote) {
      const start = Number(selectedAudioSegmentNote?.start ?? selectedAudioSegmentNote?.startTime ?? 0);
      const end = Number(selectedAudioSegmentNote?.end ?? selectedAudioSegmentNote?.endTime ?? 0);
      const meta = `${selectedAudioSegmentNote.annotatorName || 'Annotator'} • ${selectedAudioSegmentNote.label || 'Unknown'} • ${start}-${end}`;
      const segPayload = {
        annotatorId: selectedAudioSegmentNote.annotatorId || '',
        annotatorName: selectedAudioSegmentNote.annotatorName || 'Annotator',
        label: selectedAudioSegmentNote.label || 'Unknown',
        start,
        end,
      };
      if (editingNoteIndex !== null) {
        setReviewNotes(prev => prev.map((n, i) => (i === editingNoteIndex
          ? {
            ...n,
            type: 'audio',
            audioSegment: segPayload,
            commentOnly: noteText.trim(),
            comment: `[AUDIO] ${meta}\n${noteText.trim()}`,
            label: selectedAudioSegmentNote.label || null,
          }
          : n)));
      } else {
        setReviewNotes(prev => [...prev, {
          bbox: [0, 0, 0, 0],
          type: 'audio',
          audioSegment: segPayload,
          commentOnly: noteText.trim(),
          comment: `[AUDIO] ${meta}\n${noteText.trim()}`,
          label: selectedAudioSegmentNote.label || null,
        }]);
      }
      setSelectedAudioSegmentNote(null);
      setEditingNoteIndex(null);
      setNoteText('');
      return;
    }

    if (!addingNote) return;

    if (editingNoteIndex !== null) {
      setReviewNotes(prev => prev.map((n, i) => (i === editingNoteIndex
        ? { ...n, comment: noteText.trim(), bbox: [addingNote.x - 15, addingNote.y - 15, 30, 30] }
        : n)));
    } else {
      setReviewNotes(prev => [...prev, {
        bbox: [addingNote.x - 15, addingNote.y - 15, 30, 30],
        comment: noteText.trim(),
        label: null,
      }]);
    }
    setAddingNote(null);
    setEditingNoteIndex(null);
    setNoteText('');
  };

  const removeNote = (idx) => setReviewNotes(prev => prev.filter((_, i) => i !== idx));

  const editNote = (note, idx) => {
    if (!note) return;
    setEditingNoteIndex(idx);

    const parsed = parsedTextNote(note);
    if (parsed) {
      setSelectedTextSpanNote({ annotatorName: parsed.annotatorName, label: parsed.label, text: parsed.text });
      setSelectedAudioSegmentNote(null);
      setAddingNote(null);
      setNoteText(parsed.commentOnly || '');
      return;
    }

    const parsedA = parsedAudioNote(note);
    if (parsedA) {
      setSelectedAudioSegmentNote({
        annotatorId: parsedA.annotatorId,
        annotatorName: parsedA.annotatorName,
        label: parsedA.label,
        start: parsedA.start,
        end: parsedA.end,
      });
      setSelectedTextSpanNote(null);
      setAddingNote(null);
      setNoteText(parsedA.commentOnly || '');
      return;
    }

    setSelectedTextSpanNote(null);
    setSelectedAudioSegmentNote(null);
    setAddingNote({
      x: (note?.bbox?.[0] || 0) + 15,
      y: (note?.bbox?.[1] || 0) + 15,
    });
    setNoteText(note?.comment || '');
  };

  useEffect(() => {
    const visibleAnnotatorIds = selectableRelatedTasks
      .map((t) => t?.annotatorId?._id || t?.annotatorId)
      .filter((aid) => aid && annotatorVisibility[aid] !== false);

    if (visibleAnnotatorIds.length === 1) {
      setInfoAnnotatorId(visibleAnnotatorIds[0]);
    }
  }, [annotatorVisibility, selectableRelatedTasks]);

  useEffect(() => {
    let mounted = true;
    const resolveTextFromFile = async () => {
      if (!task?.dataItem) {
        if (mounted) setResolvedTextContent('');
        return;
      }

      const inlineText = task.dataItem.text || task.dataItem.content || '';
      if (inlineText) {
        if (mounted) setResolvedTextContent(String(inlineText));
        return;
      }

      const isText = (task.dataItem.mimeType || '').startsWith('text/');
      if (!isText) {
        if (mounted) setResolvedTextContent('');
        return;
      }

      try {
        const fileUrl = buildFileUrl(task.dataItem);
        if (!fileUrl) {
          if (mounted) setResolvedTextContent('');
          return;
        }
        const res = await axios.get(fileUrl, { responseType: 'text' });
        if (mounted) setResolvedTextContent(typeof res.data === 'string' ? res.data : '');
      } catch (_) {
        if (mounted) setResolvedTextContent('');
      }
    };

    resolveTextFromFile();
    return () => { mounted = false; };
  }, [task]);

  const scaleBBox = (bbox) => {
    if (!bbox || bbox.length < 4) return [0, 0, 0, 0];
    if (!imgMeta.width || !imgMeta.height) return bbox;

    const containerW = containerSize.width || imgSize.width;
    const containerH = containerSize.height || imgSize.height;
    const imgW = imgMeta.width;
    const imgH = imgMeta.height;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const renderedW = imgW * scale;
    const renderedH = imgH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;

    const [a, b, c, d] = bbox;

    // Web uses percent coords (x1,y1,x2,y2). Mobile annotator uses pixel (x,y,w,h).
    // Detect percent-style and convert to rendered pixels.
    const isPercent = [a, b, c, d].every((v) => typeof v === 'number' && v >= 0 && v <= 100);

    if (isPercent) {
      const x1 = a;
      const y1 = b;
      const x2 = c;
      const y2 = d;
      const leftPct = Math.min(x1, x2);
      const topPct = Math.min(y1, y2);
      const widthPct = Math.abs(x2 - x1);
      const heightPct = Math.abs(y2 - y1);

      return [
        (leftPct / 100) * renderedW + offsetX,
        (topPct / 100) * renderedH + offsetY,
        (widthPct / 100) * renderedW,
        (heightPct / 100) * renderedH,
      ];
    }

    const [x, y, w, h] = bbox;
    return [x * scale + offsetX, y * scale + offsetY, w * scale, h * scale];
  };

  if (loading) return <Screen><Header title="Review Task" onBack={() => navigation.goBack()} /><Loading /></Screen>;
  if (!task) return <Screen><Header title="Not Found" onBack={() => navigation.goBack()} /></Screen>;

  const isReadOnly = mode === 'history' || !['submitted'].includes(task.status);
  const isApproved = selectedActionStatus === 'approved';

  return (
    <Screen>
      <Header
        title={isReadOnly ? 'Task Details' : 'Review Task'}
        subtitle={task.projectId?.name}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status */}
        <View style={styles.statusRow}>
          <StatusBadge status={task.status} />
        </View>

        {/* Data Viewer (image/text/audio) */}
        {datasetType === 'image' && imageUrl && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>
              IMAGE {!isReadOnly ? '(tap to add feedback note)' : ''}
            </Text>

            {/* Annotator selection controls */}
            {relatedTasks.length > 0 && (
              <View style={styles.annotatorControls}>
                <View style={styles.annotatorToggleRow}>
                  <Button
                    title={showAnnotatorLabels ? 'Hide annotator labels' : 'Show annotator labels'}
                    onPress={() => setShowAnnotatorLabels(prev => !prev)}
                    variant={showAnnotatorLabels ? 'secondary' : 'primary'}
                    size="sm"
                  />
                  {!allowedAnnotatorIds && (
                    <Button
                      title="Select all"
                      onPress={() => {
                        const all = {};
                        relatedTasks.forEach((t) => {
                          const aid = t?.annotatorId?._id || t?.annotatorId;
                          if (aid) all[aid] = true;
                        });
                        setAnnotatorVisibility(all);
                        setActiveAnnotatorId('all');
                      }}
                      variant="ghost"
                      size="sm"
                    />
                  )}
                </View>

                {showAnnotatorLabels && (
                  <View style={styles.annotatorChips}>
                    {relatedTasks
                    .filter((t) => {
                      if (['approved', 'rejected'].includes(t?.status)) return false;
                      if (!allowedAnnotatorIds || allowedAnnotatorIds.length === 0) return true;
                      const aid = t?.annotatorId?._id || t?.annotatorId;
                      return aid ? allowedAnnotatorIds.includes(aid) : false;
                    })
                    .map((t) => {
                      const aid = t?.annotatorId?._id || t?.annotatorId;
                      const name = t?.annotatorId?.fullName || t?.annotatorId?.username || 'Annotator';
                      const isOn = annotatorVisibility[aid] !== false;
                      const isActive = isOn && activeAnnotatorId === aid;
                      return (
                        <TouchableOpacity
                          key={aid}
                          style={[
                            styles.annotatorChip,
                            isOn && styles.annotatorChipOn,
                            isActive && styles.annotatorChipActive,
                          ]}
                          onPress={() => {
                            setAnnotatorVisibility((prev) => ({ ...prev, [aid]: !isOn }));
                            setActiveAnnotatorId(aid);
                          }}
                        >
                          <Text style={[styles.annotatorChipText, isOn && styles.annotatorChipTextOn]}>
                            {isOn ? 'Hide' : 'Show'} {name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            <View
              style={[styles.imageContainer, { height: imgSize.height }]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width && height) setContainerSize({ width, height });
              }}
              onStartShouldSetResponder={() => !isReadOnly}
              onResponderRelease={handleImageTap}
            >
              <TouchableOpacity activeOpacity={1} onPress={handleImageTap} disabled={isReadOnly}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: imgSize.height }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    const ratio = height / width;
                    setImgMeta({ width, height });
                    setImgSize({ width: SCREEN_W, height: Math.min(SCREEN_W * ratio, 300) });
                  }}
                />
              </TouchableOpacity>
              <Svg style={StyleSheet.absoluteFill} width="100%" height={imgSize.height}>
                {annotations.map((ann, i) => {
                  const labelName = ann.rawLabel || ann.label;
                  const labelDef = labels.find(l => l.name === labelName);
                  const color = ann.color || labelDef?.color || COLORS.primary;
                  const [x, y, w, h] = scaleBBox(ann.bbox || [0, 0, 0, 0]);
                  return (
                    <React.Fragment key={ann.id || i}>
                      <Rect x={x} y={y} width={w} height={h} stroke={color} strokeWidth={2} fill={color + '22'} />
                      <SvgText x={x + 4} y={y + 16} fontSize="11" fill={color} fontWeight="bold">
                        {ann.label || labelName}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
                {reviewNotes.map((note, i) => {
                  const markerX = note.bbox[0] + 15;
                  const markerY = note.bbox[1] + 15;
                  const shortText = String(note.comment || '').replace(/\s+/g, ' ').trim().slice(0, 28);
                  const bubbleText = `${i + 1}. ${shortText}`;
                  const approxWidth = Math.max(56, Math.min(220, bubbleText.length * 5.8 + 14));
                  const maxW = containerSize.width || imgSize.width;
                  const textX = Math.max(6, Math.min(markerX + 18, maxW - approxWidth - 6));
                  const textY = Math.max(14, markerY + 4);
                  return (
                    <React.Fragment key={i}>
                      <Circle
                        cx={markerX}
                        cy={markerY}
                        r={14}
                        fill={COLORS.danger}
                        stroke={editingNoteIndex === i ? COLORS.warning : COLORS.white}
                        strokeWidth={2}
                        onPress={() => !isReadOnly && editNote(note, i)}
                      />
                      <Rect
                        x={textX - 4}
                        y={textY - 11}
                        width={approxWidth}
                        height={16}
                        rx={4}
                        fill="rgba(0,0,0,0.75)"
                        stroke={editingNoteIndex === i ? COLORS.warning : 'rgba(255,255,255,0.45)'}
                        strokeWidth={1}
                      />
                      <SvgText
                        x={textX}
                        y={textY}
                        fontSize="10"
                        fill={COLORS.white}
                        fontWeight="700"
                      >
                        {bubbleText}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
                {addingNote && (
                  <Circle cx={addingNote.x} cy={addingNote.y} r={14} fill={COLORS.warning + '88'} stroke={COLORS.warning} strokeWidth={2} />
                )}
              </Svg>
            </View>

            {addingNote && (
              <View style={styles.addNoteBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Feedback note..."
                  placeholderTextColor={COLORS.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                  multiline
                />
                <View style={styles.noteActions}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setAddingNote(null);
                      setEditingNoteIndex(null);
                      setNoteText('');
                    }}
                    variant="ghost"
                    size="sm"
                  />
                  <Button title={editingNoteIndex !== null ? 'Save Note' : 'Add Note'} onPress={addNote} size="sm" />
                </View>
              </View>
            )}

            {reviewNotes.length > 0 && (
              <View style={styles.notesList}>
                {reviewNotes.map((note, i) => (
                  <View key={i} style={[styles.noteItem, editingNoteIndex === i && styles.noteItemEditing]}>
                    <TouchableOpacity style={styles.noteItemMain} onPress={() => !isReadOnly && editNote(note, i)} activeOpacity={0.8}>
                      <View style={styles.noteNum}>
                        <Text style={styles.noteNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.noteText} numberOfLines={2}>{note.comment}</Text>
                    </TouchableOpacity>
                    {!isReadOnly && (
                      <View style={styles.noteItemActions}>
                        <TouchableOpacity onPress={() => editNote(note, i)}>
                          <Ionicons name="create-outline" size={18} color={COLORS.warning} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeNote(i)}>
                          <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {datasetType === 'text' && (
          <View style={styles.imageSection}>
            <View style={styles.textHeaderRow}>
              <Text style={styles.sectionLabel}>TEXT REVIEW</Text>
              <View style={styles.textToolbarRow}>
                <TouchableOpacity
                  style={[styles.textToggleBtn, splitView && styles.textToggleBtnOn]}
                  onPress={() => setSplitView((prev) => !prev)}
                >
                  <Text style={[styles.textToggleBtnText, splitView && styles.textToggleBtnTextOn]}>
                    Split view
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.textToggleBtn, showTextLabels && styles.textToggleBtnOn]}
                  onPress={() => setShowTextLabels((prev) => !prev)}
                >
                  <Text style={[styles.textToggleBtnText, showTextLabels && styles.textToggleBtnTextOn]}>
                    {showTextLabels ? 'Hide highlights' : 'Show highlights'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Card style={styles.textReviewPanel}>
              <View style={styles.textReviewPanelTop}>
                <Button
                  title={showAnnotatorLabels ? 'Multi-annotator: ON' : 'Multi-annotator: OFF'}
                  onPress={() => {
                    setShowAnnotatorLabels((prev) => {
                      const next = !prev;
                      if (!next) setActiveAnnotatorId('');
                      if (next && !activeAnnotatorId) setActiveAnnotatorId('all');
                      return next;
                    });
                  }}
                  variant={showAnnotatorLabels ? 'secondary' : 'primary'}
                  size="sm"
                />

                {showAnnotatorLabels && (
                  <TouchableOpacity
                    style={styles.focusAllBtn}
                    onPress={() => setActiveAnnotatorId('all')}
                  >
                    <Text style={styles.focusAllBtnText}>Focus: All annotators</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showAnnotatorLabels && textAnnotatorStats.length > 0 && (
                <View style={styles.textAnnotatorGrid}>
                  {textAnnotatorStats.map((a) => {
                    const isVisible = annotatorVisibility[a.aid] !== false;
                    const isFocused = isVisible && activeAnnotatorId === a.aid;
                    return (
                      <TouchableOpacity
                        key={a.aid}
                        style={[
                          styles.textAnnotatorCard,
                          isVisible && styles.textAnnotatorCardOn,
                          isFocused && styles.textAnnotatorCardFocus,
                        ]}
                        onPress={() => {
                          const nextVisible = !isVisible;
                          setAnnotatorVisibility((prev) => ({ ...prev, [a.aid]: nextVisible }));
                          setActiveAnnotatorId((prev) => {
                            if (!nextVisible && prev === a.aid) return 'all';
                            return prev;
                          });
                        }}
                      >
                        <Text style={[styles.textAnnotatorName, isVisible && styles.textAnnotatorNameOn]} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles.textAnnotatorMeta}>{a.count} spans</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>

            {splitView && visibleTextAnnotatorStats.length >= 1 ? (
              <View style={styles.splitWrap}>
                {visibleTextAnnotatorStats.map((ann) => {
                  const annSpans = normalizedSpansByAnnotator[ann.aid] || [];
                  const groupedByLabel = annSpans.reduce((acc, s) => {
                    const key = s.label || 'Unknown';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push({ text: s.text || '—', label: key, annotatorName: ann.name });
                    return acc;
                  }, {});

                  return (
                    <Card key={ann.aid} style={styles.splitCard}>
                      <Text style={styles.splitTitle}>{ann.name}</Text>
                      {showTextLabels ? (
                        <View style={styles.splitRows}>
                          {Object.entries(groupedByLabel).map(([labelName, snippets]) => {
                            const labelDef = labels.find((l) => l.name === labelName);
                            return (
                              <View key={`${ann.aid}_${labelName}`} style={styles.splitRowItem}>
                                <View style={styles.splitRowHeader}>
                                  <Tag
                                    label={showAnnotatorLabels ? `${labelName} • ${ann.name}` : labelName}
                                    color={labelDef?.color}
                                  />
                                  <Text style={styles.splitRowCount}>{snippets.length}</Text>
                                </View>
                                <View style={styles.splitSnippetWrap}>
                                  {snippets.slice(0, 4).map((item, idx) => (
                                    (() => {
                                      const key = textSpanKey(item);
                                      const existing = key ? textNotesBySpanKey.get(key) : null;
                                      return (
                                    <TouchableOpacity
                                      key={`${ann.aid}_${labelName}_${idx}`}
                                      onPress={() => {
                                        if (isReadOnly) return;
                                        beginTextSpanNote(item);
                                      }}
                                      activeOpacity={0.8}
                                      style={[
                                        styles.textSpanSelectBtn,
                                        selectedTextSpanNote?.text === item.text
                                          && selectedTextSpanNote?.label === item.label
                                          && selectedTextSpanNote?.annotatorName === item.annotatorName
                                          && styles.textSpanSelectBtnActive,
                                      ]}
                                    >
                                      <Text style={styles.splitSnippetText}>
                                        • {item.text}
                                      </Text>
                                      {existing?.commentOnly ? (
                                        <Text style={styles.textSpanNotePreview} numberOfLines={1}>
                                          Note: {existing.commentOnly}
                                        </Text>
                                      ) : null}
                                    </TouchableOpacity>
                                      );
                                    })()
                                  ))}
                                  {snippets.length > 4 && (
                                    <Text style={styles.splitMoreText}>+{snippets.length - 4} more</Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.textBody}>{textContent || 'No text content'}</Text>
                      )}
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card>
                {showTextLabels ? (
                  <Text style={styles.textBody}>
                    {getHighlightedTextParts().map((part, idx) => {
                      if (part.type === 'plain') {
                        return <Text key={`plain-${idx}`} style={styles.textPlain}>{part.text}</Text>;
                      }
                      const labelDef = labels.find((l) => l.name === part.label);
                      const key = textSpanKey({ annotatorName: part.annotatorName, label: part.label, text: part.text });
                      const existing = key ? textNotesBySpanKey.get(key) : null;
                      return (
                        <Text
                          key={`label-${idx}`}
                          style={[
                            styles.textLabelHighlight,
                            existing?.commentOnly && styles.textLabelHighlightHasNote,
                            {
                              backgroundColor: (labelDef?.color || COLORS.primary) + '33',
                              borderColor: (labelDef?.color || COLORS.primary) + 'AA',
                            },
                          ]}
                          onPress={() => {
                            if (isReadOnly) return;
                            beginTextSpanNote({
                              annotatorName: part.annotatorName || 'Annotator',
                              label: part.label || 'Unknown',
                              text: part.text || '—',
                            });
                          }}
                        >
                          {showAnnotatorLabels && part.annotatorName ? `[${part.annotatorName}] ` : ''}{part.text}
                        </Text>
                      );
                    })}
                  </Text>
                ) : (
                  <Text style={styles.textBody}>{textContent || 'No text content'}</Text>
                )}
              </Card>
            )}

            {selectedTextSpanNote && !isReadOnly && (
              <View style={styles.addNoteBox}>
                <Text style={styles.textNoteContext}>
                  Đang ghi chú cho: {selectedTextSpanNote.annotatorName} • {selectedTextSpanNote.label}
                </Text>
                <Text style={styles.textNoteSnippet} numberOfLines={3}>
                  "{selectedTextSpanNote.text}"
                </Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Feedback note for this text span..."
                  placeholderTextColor={COLORS.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                  multiline
                />
                <View style={styles.noteActions}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setSelectedTextSpanNote(null);
                      setEditingNoteIndex(null);
                      setNoteText('');
                    }}
                    variant="ghost"
                    size="sm"
                  />
                  <Button title={editingNoteIndex !== null ? 'Save Note' : 'Add Note'} onPress={addNote} size="sm" />
                </View>
              </View>
            )}

          </View>
        )}

        {datasetType === 'audio' && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>AUDIO REVIEW</Text>
            <Card>
              <Text style={styles.audioFilename}>{task?.dataItem?.filename || 'Audio file'}</Text>
              <Text style={styles.audioHint}>MimeType: {task?.dataItem?.mimeType || 'audio/*'}</Text>
              <Text style={styles.audioHint}>Duration: {audioDuration > 0 ? `${audioDuration.toFixed(2)}s` : '—'}</Text>

              <View style={styles.annotatorToggleRow}>
                <Button
                  title={showAnnotatorLabels ? 'Multi-annotator: ON' : 'Multi-annotator: OFF'}
                  onPress={() => {
                    setShowAnnotatorLabels((prev) => {
                      const next = !prev;
                      if (!next) setActiveAnnotatorId('');
                      if (next && !activeAnnotatorId) setActiveAnnotatorId('all');
                      return next;
                    });
                  }}
                  variant={showAnnotatorLabels ? 'secondary' : 'primary'}
                  size="sm"
                />
                <Button
                  title={playingSegKey === '__full__' ? 'Playing full...' : 'Play full audio'}
                  onPress={playFullAudio}
                  variant="ghost"
                  size="sm"
                  disabled={playingSegKey === '__full__'}
                />
                {playingSegKey ? (
                  <Button
                    title="Stop"
                    onPress={stopAudioSegment}
                    variant="ghost"
                    size="sm"
                  />
                ) : null}
              </View>

              {showAnnotatorLabels && audioAnnotatorStats.length > 0 && (
                <View style={styles.textAnnotatorGrid}>
                  {audioAnnotatorStats.map((a) => {
                    const isVisible = annotatorVisibility[a.aid] !== false;
                    const isFocused = isVisible && activeAnnotatorId === a.aid;
                    return (
                      <TouchableOpacity
                        key={a.aid}
                        style={[
                          styles.textAnnotatorCard,
                          isVisible && styles.textAnnotatorCardOn,
                          isFocused && styles.textAnnotatorCardFocus,
                        ]}
                        onPress={() => {
                          setAnnotatorVisibility((prev) => ({ ...prev, [a.aid]: !isVisible }));
                          setActiveAnnotatorId((prev) => (prev === a.aid ? 'all' : a.aid));
                        }}
                      >
                        <Text style={[styles.textAnnotatorName, isVisible && styles.textAnnotatorNameOn]} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles.textAnnotatorMeta}>{a.count} segments</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View
                style={styles.audioWaveWrap}
                onLayout={(e) => {
                  const { width } = e.nativeEvent.layout;
                  if (width) setAudioWaveWidth(Math.max(220, width - 8));
                }}
              >
                <Svg width={audioWaveWidth} height={120}>
                  {audioWaveBars.map((amp, idx) => {
                    const barW = Math.max(2, (audioWaveWidth - 16) / audioWaveBars.length - 1.5);
                    const gap = 1.5;
                    const x = 8 + idx * (barW + gap);
                    const h = 14 + amp * 52;
                    const y = 52 - h / 2;
                    return (
                      <Rect
                        key={`bar-${idx}`}
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        rx={1.5}
                        fill={COLORS.primary + '88'}
                      />
                    );
                  })}

                  {showAnnotatorLabels && audioSegments.map((seg, idx) => {
                    if (!audioDuration || audioDuration <= 0) return null;
                    const start = Number(seg?.start ?? seg?.startTime ?? 0);
                    const end = Number(seg?.end ?? seg?.endTime ?? 0);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
                    const x = 8 + (start / audioDuration) * (audioWaveWidth - 16);
                    const w = Math.max(2, ((end - start) / audioDuration) * (audioWaveWidth - 16));
                    const labelName = seg?.label || 'Unknown';
                    const labelDef = labels.find((l) => l.name === labelName);
                    const baseColor = labelDef?.color || COLORS.primary;
                    const segKey = `${seg?.annotatorId || 'base'}-${idx}-${start}-${end}-${labelName}`;
                    const isPlaying = playingSegKey === segKey;
                    return (
                      <Rect
                        key={`seg-overlay-${idx}`}
                        x={x}
                        y={88}
                        width={w}
                        height={18}
                        rx={6}
                        fill={isPlaying ? COLORS.statusApproved + '88' : `${baseColor}66`}
                        stroke={isPlaying ? COLORS.statusApproved : baseColor}
                        strokeWidth={1}
                        onPress={() => playAudioSegment(seg, segKey)}
                      />
                    );
                  })}
                </Svg>
              </View>

              {showAnnotatorLabels && (
                <>
                  <Text style={styles.audioHint}>Chạm vào label bên dưới để phát đúng đoạn audio của annotator đó.</Text>
                  <View style={styles.audioAnnotatorSection}>
                    {visibleAudioAnnotatorStats.map((ann) => {
                      const annSegments = ann.segments || [];
                      return (
                        <View key={`audio-ann-${ann.aid}`} style={styles.audioAnnotatorBlock}>
                          <Text style={styles.audioAnnotatorName}>{ann.name}</Text>
                          {annSegments.slice(0, 24).map((seg, idx) => {
                            const labelName = seg?.label || 'Unknown';
                            const labelDef = labels.find((l) => l.name === labelName);
                            const start = Number(seg?.start ?? seg?.startTime ?? 0);
                            const end = Number(seg?.end ?? seg?.endTime ?? 0);
                            const segKey = `${ann.aid}-${idx}-${start}-${end}-${labelName}`;
                            const isPlaying = playingSegKey === segKey;
                            const segForNote = {
                              annotatorId: ann.aid,
                              annotatorName: ann.name,
                              label: labelName,
                              start,
                              end,
                            };
                            const noteKey = audioSegmentKey(segForNote);
                            const existing = noteKey ? audioNotesBySegmentKey.get(noteKey) : null;
                            const isActive = selectedAudioSegmentNote
                              && selectedAudioSegmentNote.annotatorId === segForNote.annotatorId
                              && selectedAudioSegmentNote.label === segForNote.label
                              && Number(selectedAudioSegmentNote.start) === Number(segForNote.start)
                              && Number(selectedAudioSegmentNote.end) === Number(segForNote.end);
                            return (
                              <TouchableOpacity
                                key={segKey}
                                style={[styles.simpleListRow, isActive && styles.audioSegmentRowActive]}
                                activeOpacity={0.85}
                                onPress={() => {
                                  if (isReadOnly) return;
                                  beginAudioSegmentNote(segForNote);
                                }}
                              >
                                <View style={styles.simpleListHeaderRow}>
                                  <Text style={styles.simpleListTitle}>#{idx + 1}</Text>
                                  <TouchableOpacity onPress={() => playAudioSegment(seg, segKey)} activeOpacity={0.8}>
                                    <Tag
                                      label={showAnnotatorLabels ? `${labelName} • ${ann.name}` : labelName}
                                      color={isPlaying ? COLORS.statusApproved : labelDef?.color}
                                    />
                                  </TouchableOpacity>
                                </View>
                                <Text style={styles.simpleListValue}>{start} - {end}</Text>
                                {existing?.commentOnly ? (
                                  <Text style={styles.audioSegmentNotePreview} numberOfLines={2}>
                                    Note: {existing.commentOnly}
                                  </Text>
                                ) : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {selectedAudioSegmentNote && !isReadOnly && (
                <View style={styles.addNoteBox}>
                  <Text style={styles.textNoteContext}>
                    Đang ghi chú cho: {selectedAudioSegmentNote.annotatorName} • {selectedAudioSegmentNote.label}
                  </Text>
                  <Text style={styles.textNoteSnippet} numberOfLines={2}>
                    Segment: {Number(selectedAudioSegmentNote.start)} - {Number(selectedAudioSegmentNote.end)}
                  </Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Feedback note for this audio segment..."
                    placeholderTextColor={COLORS.textMuted}
                    value={noteText}
                    onChangeText={setNoteText}
                    autoFocus
                    multiline
                  />
                  <View style={styles.noteActions}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setSelectedAudioSegmentNote(null);
                        setEditingNoteIndex(null);
                        setNoteText('');
                      }}
                      variant="ghost"
                      size="sm"
                    />
                    <Button title={editingNoteIndex !== null ? 'Save Note' : 'Add Note'} onPress={addNote} size="sm" />
                  </View>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Annotations Summary */}
        {datasetType === 'image' && (
          <>
            <Text style={styles.sectionLabel}>ANNOTATIONS ({summaryItems.length})</Text>
            {summaryItems.length === 0 ? (
              <Card><Text style={styles.noData}>No annotations</Text></Card>
            ) : (
              <Card>
                <View style={styles.labelsWrap}>
                  {[...new Set(annotations.map(a => a.rawLabel || a.label))].map(label => {
                    const ld = labels.find(l => l.name === label);
                    const count = annotations.filter(a => (a.rawLabel || a.label) === label).length;
                    return (
                      <View key={label} style={styles.labelCountItem}>
                        <Tag label={label} color={ld?.color} />
                        <Text style={styles.labelCountNum}>×{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}
          </>
        )}

        {/* Task Info */}
        <Text style={styles.sectionLabel}>TASK INFO</Text>
        <Card>
          {allowedAnnotatorIds && allowedAnnotatorIds.length > 1 ? (
            <View>
              <InfoRow
                icon="people-outline"
                label="Annotators"
                value={`Selected (${allowedAnnotatorIds.length})`}
              />
              <View style={styles.annotatorChipsInline}>
                {allowedAnnotatorIds.map((aid) => {
                  const match = relatedTasks.find((t) => (t?.annotatorId?._id || t?.annotatorId) === aid);
                  const name = match?.annotatorId?.fullName || match?.annotatorId?.username || aid;
                  const isActive = infoAnnotatorId
                    ? infoAnnotatorId === aid
                    : (allowedAnnotatorIds.length === 1 || task.annotatorId?._id === aid || task.annotatorId === aid);
                  return (
                    <TouchableOpacity
                      key={aid}
                      style={[styles.annotatorChipInline, isActive && styles.annotatorChipInlineActive]}
                      onPress={() => setInfoAnnotatorId(aid)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.annotatorChipInlineText, isActive && styles.annotatorChipInlineTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <InfoRow icon="person-outline" label="Annotator" value={task.annotatorId?.fullName} />
          )}
          <InfoRow
            icon="paper-plane-outline"
            label="Submitted"
            value={(() => {
              if (allowedAnnotatorIds && allowedAnnotatorIds.length > 1) {
                const targetId = infoAnnotatorId || allowedAnnotatorIds[0];
                const match = relatedTasks.find((t) => (t?.annotatorId?._id || t?.annotatorId) === targetId);
                return match?.submittedAt ? new Date(match.submittedAt).toLocaleString() : '—';
              }
              return task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—';
            })()}
          />
          {task.reviewComments && (
            <InfoRow icon="chatbubble-outline" label="Review Note" value={task.reviewComments} />
          )}
        </Card>

        {/* Guidelines */}
        {task.projectId?.guidelines && (
          <>
            <Text style={styles.sectionLabel}>GUIDELINES</Text>
            <Card><Text style={styles.guidelines}>{task.projectId.guidelines}</Text></Card>
          </>
        )}

        {/* Project Tasks Preview */}
        {uniqueProjectItems.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PROJECT TASKS ({uniqueProjectItems.length})</Text>
            <View style={styles.projectTasksRow}>
              {uniqueProjectItems.slice(0, 12).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.projectThumb}
                  onPress={() => navigation.navigate('ReviewerTask', { taskId: item.taskId, mode: item.status === 'submitted' ? 'review' : 'history', annotatorIds })}
                >
                  {item.thumb ? (
                    <Image source={{ uri: item.thumb }} style={styles.projectThumbImg} />
                  ) : item.type === 'audio' ? (
                    <View style={[styles.projectThumbFallback, styles.projectThumbFallbackAudio]}>
                      <View style={[styles.projectThumbIconWrap, styles.projectThumbIconWrapAudio]}>
                        <Ionicons name="musical-notes" size={20} color="#FFD28C" />
                      </View>
                    </View>
                  ) : item.type === 'text' ? (
                    <View style={[styles.projectThumbFallback, styles.projectThumbFallbackText]}>
                      <View style={[styles.projectThumbIconWrap, styles.projectThumbIconWrapText]}>
                        <Ionicons name="document-text" size={19} color="#B9C8FF" />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.projectThumbFallback, styles.projectThumbFallbackUnknown]}>
                      <View style={styles.projectThumbIconWrap}>
                        <Ionicons name="document-outline" size={18} color={COLORS.textMuted} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Action Buttons */}
        {!isReadOnly && (
          <>
            <Text style={styles.actionTargetHint}>Chấm điểm cho: {selectedActionAnnotatorName}</Text>
            <View style={styles.actionArea}>
              <Button
                title="Approve"
                onPress={handleApprove}
                loading={approving}
                variant="success"
                icon="checkmark-circle-outline"
                size="lg"
                style={{ flex: 1 }}
                disabled={!canScoreSelectedTask}
              />
              <Button
                title="Reject"
                onPress={() => setShowRejectModal(true)}
                variant="danger"
                icon="close-circle-outline"
                size="lg"
                style={{ flex: 1 }}
                disabled={!canScoreSelectedTask}
              />
            </View>
          </>
        )}

        {!isReadOnly && datasetType === 'image' && !primaryAlreadySetForItem && canScoreSelectedTask && (
          <View style={styles.primaryArea}>
            <Button
              title={primaryQueued && !isApproved ? 'Primary Queued' : 'Set Primary'}
              onPress={handleSetPrimary}
              loading={settingPrimary}
              variant={primaryQueued && !isApproved ? 'secondary' : 'primary'}
              icon={primaryQueued && !isApproved ? 'star' : 'star-outline'}
              size="lg"
            />
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Task</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>ERROR CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {ERROR_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.categoryBtn, errorCategory === c.value && styles.categoryBtnActive]}
                  onPress={() => setErrorCategory(c.value)}
                >
                  <Text style={[styles.categoryText, errorCategory === c.value && { color: COLORS.danger }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>REASON *</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Explain why this task is being rejected..."
              placeholderTextColor={COLORS.textMuted}
              value={rejectComment}
              onChangeText={setRejectComment}
              multiline
              numberOfLines={4}
            />

            {reviewNotes.length === 0 && (
              <View style={styles.noteWarning}>
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.noteWarningText}>
                  Add at least one feedback note before rejecting (image or selected text span).
                </Text>
              </View>
            )}

            <Button
              title={`Reject with ${reviewNotes.length} note(s)`}
              onPress={handleReject}
              loading={rejecting}
              variant="danger"
              icon="close-circle-outline"
              disabled={reviewNotes.length === 0}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 100 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  annotatorInfo: { fontSize: 13, color: COLORS.textSecondary },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  imageSection: { marginBottom: SPACING.md },
  imageContainer: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  annotatorControls: { marginBottom: SPACING.sm },
  annotatorToggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
  annotatorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  annotatorChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  annotatorChipOn: {
    backgroundColor: COLORS.primary + '22',
    borderColor: COLORS.primary + '66',
  },
  annotatorChipActive: { borderColor: COLORS.warning, borderWidth: 2 },
  annotatorChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  annotatorChipTextOn: { color: COLORS.primary },
  addNoteBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '55', marginTop: SPACING.sm,
  },
  noteInput: {
    color: COLORS.textPrimary, fontSize: 14, minHeight: 60,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
  notesList: { marginTop: SPACING.sm, gap: SPACING.xs },
  noteItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.dangerGlow, padding: SPACING.sm, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.danger + '33',
  },
  noteItemEditing: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningGlow,
  },
  noteItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noteItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noteNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  noteNumText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textPrimary },
  textSpanNotePreview: { marginTop: 4, fontSize: 11, color: COLORS.textMuted },
  textLabelHighlightHasNote: { borderBottomWidth: 2, borderBottomColor: COLORS.warning },
  audioSegmentNotePreview: { marginTop: 6, fontSize: 11, color: COLORS.textMuted },
  audioSegmentRowActive: { backgroundColor: COLORS.primary + '14' },
  labelsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  labelCountItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelCountNum: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  noData: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },
  guidelines: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  actionTargetHint: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    fontSize: 14,
    color: '#FFD84D',
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    backgroundColor: '#3A2A00',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#FFB800',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionArea: {
    flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs,
  },
  primaryArea: { marginTop: SPACING.md },
  projectTasksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  projectThumb: {
    width: 72, height: 72,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  projectThumbImg: { width: '100%', height: '100%' },
  projectThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  projectThumbFallbackAudio: {
    backgroundColor: 'rgba(255,183,77,0.10)',
  },
  projectThumbFallbackText: {
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  projectThumbFallbackUnknown: {
    backgroundColor: COLORS.bgElevated,
  },
  projectThumbIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  projectThumbIconWrapAudio: {
    borderColor: 'rgba(255,183,77,0.55)',
    backgroundColor: 'rgba(255,183,77,0.20)',
  },
  projectThumbIconWrapText: {
    borderColor: 'rgba(167,139,250,0.55)',
    backgroundColor: 'rgba(167,139,250,0.20)',
  },
  annotatorChipsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  annotatorChipInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  annotatorChipInlineText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  annotatorChipInlineActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  annotatorChipInlineTextActive: { color: COLORS.primary },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.lg },
  categoryBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  categoryBtnActive: { backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger },
  categoryText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  rejectInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 100,
    textAlignVertical: 'top', marginBottom: SPACING.lg,
  },
  noteWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warningGlow, padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.warning + '44', marginBottom: SPACING.md,
  },
  noteWarningText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 18 },
  textHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: SPACING.xs,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  textToolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  textToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  textToggleBtnOn: {
    borderColor: COLORS.primary + 'AA',
    backgroundColor: COLORS.primary + '22',
  },
  textToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  textToggleBtnTextOn: {
    color: COLORS.primary,
  },
  textReviewPanel: {
    marginBottom: SPACING.sm,
  },
  textReviewPanelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  focusAllBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusAllBtnText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  textAnnotatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  textAnnotatorCard: {
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  textAnnotatorCardOn: {
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primary + '15',
  },
  textAnnotatorCardFocus: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  textAnnotatorName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  textAnnotatorNameOn: {
    color: COLORS.textPrimary,
  },
  textAnnotatorMeta: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  splitWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  splitCard: {
    width: '100%',
  },
  splitTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  splitRows: {
    gap: SPACING.xs,
  },
  splitRowItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    gap: 6,
  },
  splitRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  splitRowCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  splitSnippetWrap: {
    marginTop: 4,
    gap: 2,
  },
  splitSnippetText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  textSpanSelectBtn: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  textSpanSelectBtnActive: {
    backgroundColor: COLORS.warning + '22',
    borderWidth: 1,
    borderColor: COLORS.warning + '66',
  },
  textNoteContext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '700',
  },
  textNoteSnippet: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  splitMoreText: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  splitRowText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  diffPanel: {
    marginTop: SPACING.sm,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 6,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  diffText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyDiffText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  textBody: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  textPlain: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  textLabelHighlight: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  textMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  audioFilename: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  audioHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  audioWaveWrap: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioAnnotatorSection: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  audioAnnotatorBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    padding: SPACING.sm,
  },
  audioAnnotatorName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  simpleListRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  simpleListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: SPACING.sm,
  },
  simpleListTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  simpleListValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
