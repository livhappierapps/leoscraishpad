import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ErrorNotice, LocalNotice, NeonButton, Page, PageHeading } from '@/components/CrashPadUI';
import { useCrashPad, parseBackup } from '@/data/CrashPadContext';
import { useColors } from '@/hooks/useColors';

export default function BackupScreen() {
  const colors = useColors();
  const { data, error, createBackup, replaceData, clearData, saveConversationVault } = useCrashPad();
  const [backupText, setBackupText] = useState('');
  const [vaultDraft, setVaultDraft] = useState(data.conversationVault);
  const [operationError, setOperationError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setVaultDraft(data.conversationVault);
  }, [data.conversationVault]);

  const exportBackup = async () => {
    setOperationError('');
    try {
      await Share.share({ title: "Leo's CrAIsh Pad backup", message: createBackup() });
    } catch {
      setOperationError('The backup could not be opened for sharing.');
    }
  };

  const copyBackup = async () => {
    try {
      await Clipboard.setStringAsync(createBackup());
      setStatus('BACKUP COPIED TO CLIPBOARD');
    } catch {
      setOperationError('The backup could not be copied on this device.');
    }
  };

  const restore = () => {
    const next = parseBackup(backupText);
    if (!next) {
      setOperationError('That backup is not valid. Use a Crash Pad JSON backup or a supported earlier Leo’s Crash Pad backup.');
      setStatus('');
      return;
    }
    Alert.alert(
      'Replace this device’s saved data?',
      'The imported backup will replace the persona, memories, thread, conversation vault, and model settings. It will not replace the API key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore backup',
          onPress: () => {
            void replaceData(next).then((ok) => {
              if (ok) {
                setBackupText('');
                setOperationError('');
                setStatus('BACKUP RESTORED ON THIS DEVICE');
              }
            });
          },
        },
      ],
    );
  };

  const saveVault = async () => {
    const ok = await saveConversationVault(vaultDraft);
    if (ok) setStatus('CONVERSATION VAULT SAVED');
  };

  const confirmClear = () =>
    Alert.alert(
      'Clear this device’s saved data?',
      'This removes the saved thread, memories, persona, and conversation vault. The stored API key stays in secure storage. Export a backup first if you may want this data later.',
      [
        { text: 'Keep data', style: 'cancel' },
        { text: 'Clear saved data', onPress: () => void clearData().then((ok) => ok && setStatus('LOCAL DATA CLEARED')) },
      ],
    );

  return (
    <Page>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} bottomOffset={22} keyboardShouldPersistTaps="handled">
        <PageHeading
          eyebrow="BACKUP // CONTINUITY"
          title="Keep a copy."
          detail="Export or restore the local thread, persona, memories, and conversation notes."
          accent="cyan"
        />
        <LocalNotice>
          Backups include your personal conversation data and model name, but never your API key. The share sheet may create copies outside this app.
        </LocalNotice>
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        {operationError ? <ErrorNotice>{operationError}</ErrorNotice> : null}
        {status ? <Text style={[styles.status, { color: colors.cyan }]}>{status}</Text> : null}

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="archive-outline" size={22} color={colors.gold} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Export a backup</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            JSON backup of the current thread, editable persona, memories, vault notes, and non-secret model settings.
          </Text>
          <NeonButton label="Share JSON backup…" icon="share-outline" color="cyan" onPress={() => void exportBackup()} />
          <NeonButton label="Copy backup JSON" icon="copy-outline" color="gold" onPress={() => void copyBackup()} />
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="download-outline" size={22} color={colors.purple} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Restore a backup</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            This supports the JSON format from the supplied single-file Crash Pad prototype as well as new backups. Restore replaces local content; the secure API key remains unchanged.
          </Text>
          <TextInput
            value={backupText}
            onChangeText={(text) => {
              setBackupText(text);
              setOperationError('');
              setStatus('');
            }}
            placeholder="Paste a backup JSON here…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            style={[styles.backupInput, { color: colors.foreground, backgroundColor: colors.surfaceDeep, borderColor: colors.input }]}
            testID="input-backup-json"
            accessibilityLabel="Paste a Crash Pad backup"
          />
          <NeonButton label="Validate and restore" icon="refresh-outline" color="purple" onPress={restore} disabled={!backupText.trim()} />
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="book-outline" size={22} color={colors.pink} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Conversation vault</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            Paste exported conversation notes here. They are background context, not a live session, and a maximum of 6,000 characters is included with each model request.
          </Text>
          <TextInput
            value={vaultDraft}
            onChangeText={(text) => {
              setVaultDraft(text);
              setStatus('');
            }}
            placeholder="Paste conversation notes you want available in the persona context…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            maxLength={50000}
            style={[styles.backupInput, styles.vaultInput, { color: colors.foreground, backgroundColor: colors.surfaceDeep, borderColor: colors.input }]}
            testID="input-conversation-vault"
          />
          <Text style={[styles.counter, { color: colors.mutedForeground }]}>{vaultDraft.length.toLocaleString()} characters</Text>
          <NeonButton label="Save conversation vault" icon="save-outline" color="pink" onPress={() => void saveVault()} />
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.surfaceDeep, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.pink }]}>CLEAR LOCAL DATA</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            {data.messages.length} saved messages · {data.memories.length} memories · {data.persona.name || 'Leo'}’s persona
          </Text>
          <NeonButton label="Clear saved data" icon="trash-outline" color="pink" onPress={confirmClear} />
        </View>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 13 },
  actionCard: { borderWidth: 1, borderRadius: 17, padding: 14, gap: 10 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  backupInput: { borderWidth: 1, borderRadius: 12, minHeight: 100, maxHeight: 190, padding: 12, fontFamily: 'Menlo', fontSize: 10, lineHeight: 15 },
  vaultInput: { minHeight: 160 },
  counter: { fontFamily: 'Menlo', fontSize: 9, textAlign: 'right' },
  status: { fontFamily: 'Menlo', fontSize: 9, letterSpacing: 0.8, textAlign: 'center' },
});
