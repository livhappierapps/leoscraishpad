import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ErrorNotice, NeonButton, Page, PageHeading } from '@/components/CrashPadUI';
import { useCrashPad, type MemoryNote } from '@/data/CrashPadContext';
import { useColors } from '@/hooks/useColors';

export default function MemoriesScreen() {
  const colors = useColors();
  const { data, isLoading, error, saveMemory, toggleMemoryPin, deleteMemory } = useCrashPad();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  const memories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...data.memories]
      .filter((item) => !needle || `${item.title} ${item.content} ${item.category}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.memories, query]);

  const resetForm = () => {
    setEditingId(undefined);
    setTitle('');
    setContent('');
    setCategory('');
  };

  const beginEdit = (item: MemoryNote) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category);
  };

  const commit = async () => {
    if (!title.trim() || !content.trim()) return;
    const ok = await saveMemory(
      { title: title.trim(), content: content.trim(), category: category.trim() || 'Personal', pinned: editingId ? data.memories.find((item) => item.id === editingId)?.pinned ?? false : false },
      editingId,
    );
    if (ok) {
      resetForm();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const confirmDelete = (item: MemoryNote) =>
    Alert.alert('Delete this memory?', `“${item.title}” will be removed from this device.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', onPress: () => void deleteMemory(item.id) },
    ]);

  return (
    <Page>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <PageHeading eyebrow="MEMORY BANK // LOCAL" title="Keep the good stuff." detail="Save the details you want carried forward between conversations." accent="cyan" />
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.formTitleRow}>
            <Text style={[styles.formTitle, { color: colors.gold }]}>{editingId ? 'EDIT MEMORY' : 'ADD A MEMORY'}</Text>
            {editingId ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel memory edit" onPress={resetForm} testID="button-cancel-memory">
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <TextInput value={title} onChangeText={setTitle} placeholder="Short title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input }]} maxLength={120} testID="input-memory-title" />
          <TextInput value={content} onChangeText={setContent} placeholder="What should stay remembered?" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" style={[styles.input, styles.multiline, { color: colors.foreground, borderColor: colors.input }]} maxLength={3000} testID="input-memory-content" />
          <TextInput value={category} onChangeText={setCategory} placeholder="Category (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input }]} maxLength={60} testID="input-memory-category" />
          <NeonButton label={editingId ? 'Save changes' : 'Pin this in memory'} icon={editingId ? 'checkmark' : 'add'} color="cyan" onPress={() => void commit()} disabled={!title.trim() || !content.trim() || isLoading} />
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{data.memories.length} SAVED</Text>
          {data.memories.length > 0 ? (
            <TextInput value={query} onChangeText={setQuery} placeholder="Search memories" placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, borderColor: colors.border }]} testID="input-search-memories" />
          ) : null}
        </View>

        {isLoading ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>Loading your local memory bank…</Text>
        ) : memories.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surfaceDeep }]}>
            <Ionicons name="sparkles-outline" size={23} color={colors.gold} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{query ? 'Nothing matches.' : 'Nothing saved yet.'}</Text>
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>{query ? 'Try another search.' : 'Create the first memory above. It stays on this device.'}</Text>
          </View>
        ) : (
          <View style={styles.memoryList}>
            {memories.map((item) => (
              <View key={item.id} style={[styles.memoryCard, { backgroundColor: colors.card, borderColor: item.pinned ? colors.gold : colors.border }]} testID={`memory-${item.id}`}>
                <View style={styles.memoryHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memoryCategory, { color: item.pinned ? colors.gold : colors.cyan }]}>{item.pinned ? 'PINNED' : item.category.toUpperCase()}</Text>
                    <Text style={[styles.memoryTitle, { color: colors.foreground }]}>{item.title}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={item.pinned ? 'Unpin memory' : 'Pin memory'} onPress={() => void toggleMemoryPin(item.id)} style={styles.iconButton} testID={`button-pin-${item.id}`}>
                    <Ionicons name={item.pinned ? 'star' : 'star-outline'} size={19} color={colors.gold} />
                  </Pressable>
                </View>
                <Text style={[styles.memoryContent, { color: colors.mutedForeground }]}>{item.content}</Text>
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" onPress={() => beginEdit(item)} style={styles.action} testID={`button-edit-${item.id}`}>
                    <Ionicons name="create-outline" size={16} color={colors.purple} />
                    <Text style={[styles.actionText, { color: colors.purple }]}>Edit</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => confirmDelete(item)} style={styles.action} testID={`button-delete-${item.id}`}>
                    <Ionicons name="trash-outline" size={16} color={colors.pink} />
                    <Text style={[styles.actionText, { color: colors.pink }]}>Delete</Text>
                  </Pressable>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  form: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  input: { borderWidth: 1, borderRadius: 11, minHeight: 45, paddingHorizontal: 12, paddingVertical: 11, fontFamily: 'Inter_400Regular', fontSize: 14 },
  multiline: { minHeight: 88 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 130, fontFamily: 'Inter_400Regular', fontSize: 12 },
  emptyCard: { borderWidth: 1, borderRadius: 16, minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 9, padding: 18 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  memoryList: { gap: 10 },
  memoryCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 11 },
  memoryHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  memoryCategory: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.2, marginBottom: 5 },
  memoryTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  iconButton: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center' },
  memoryContent: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 17, paddingTop: 5 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  date: { marginLeft: 'auto', fontFamily: 'Inter_400Regular', fontSize: 10 },
});
