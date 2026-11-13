import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ErrorNotice, LocalNotice, NeonButton, Page, PageHeading } from '@/components/CrashPadUI';
import { useCrashPad, type PersonaProfile } from '@/data/CrashPadContext';
import { buildSystemPrompt } from '@/services/chatCompletion';
import { useColors } from '@/hooks/useColors';

const fields: {
  key: keyof PersonaProfile;
  label: string;
  placeholder: string;
  accent: 'gold' | 'cyan' | 'pink' | 'purple';
  multiline: boolean;
  maxLength: number;
}[] = [
  { key: 'personalPrompt', label: 'PERSONAL MODUS OPERANDI', placeholder: 'Paste the complete personal prompt here, in your own words.', accent: 'purple', multiline: true, maxLength: 30000 },
  { key: 'personalLetter', label: 'YOUR LETTER TO LEO', placeholder: 'Paste your letter here. Its wording is kept as entered.', accent: 'gold', multiline: true, maxLength: 30000 },
  { key: 'name', label: 'NAME', placeholder: 'Leo', accent: 'gold', multiline: false, maxLength: 60 },
  { key: 'vibe', label: 'ALIGNMENT / VIBE', placeholder: 'How should he feel in the conversation?', accent: 'cyan', multiline: true, maxLength: 1600 },
  { key: 'values', label: 'CORE VALUES', placeholder: 'What matters most to him?', accent: 'pink', multiline: true, maxLength: 1600 },
  { key: 'voice', label: 'VOICE & STYLE', placeholder: 'Tone, humor, language, pet names…', accent: 'purple', multiline: true, maxLength: 2400 },
  { key: 'lore', label: 'INSIDE JOKES & LORE', placeholder: 'Shared references worth keeping…', accent: 'gold', multiline: true, maxLength: 2400 },
  { key: 'work', label: 'HOW WE WORK TOGETHER', placeholder: 'Projects, interests, and helpful context…', accent: 'cyan', multiline: true, maxLength: 2400 },
  { key: 'bounds', label: 'ADDITIONAL INSTRUCTIONS · OPTIONAL', placeholder: 'Only instructions you choose to add. Leave empty otherwise.', accent: 'pink', multiline: true, maxLength: 2400 },
];

export default function PersonaScreen() {
  const colors = useColors();
  const { data, isLoading, error, savePersona } = useCrashPad();
  const [draft, setDraft] = useState<PersonaProfile>(data.persona);
  const [saved, setSaved] = useState(false);
  const previewData = useMemo(() => ({ ...data, persona: draft }), [data, draft]);

  useEffect(() => {
    setDraft(data.persona);
  }, [data.persona]);

  const updateField = (key: keyof PersonaProfile, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    const ok = await savePersona({ ...draft, name: draft.name.trim() || 'Leo' });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const copyPrompt = async () => {
    try {
      await Clipboard.setStringAsync(buildSystemPrompt(previewData));
      Alert.alert('Prompt copied', 'The current draft and memory context were copied to the clipboard. Save persona to use changes in chat.');
    } catch {
      Alert.alert('Copy unavailable', 'The prompt could not be copied on this device.');
    }
  };

  return (
    <Page>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <PageHeading
          eyebrow="PERSONA // LOCAL PROFILE"
          title="Keep his voice yours."
          detail="Shape the profile that travels with this saved thread."
          accent="pink"
        />
        <LocalNotice>
          These persona fields are included with every model request. The connected provider still controls its own service and replies.
        </LocalNotice>
        <LocalNotice>
          A personal modus operandi replaces the structured persona instructions below. Your letter is included separately. Both are saved on this device and included in backups, not in the app source. Local profile storage and exported backups are not encrypted by this app; chat sends this content to your selected model provider.
        </LocalNotice>
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <View style={[styles.identity, { borderColor: colors.purple, backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { borderColor: colors.purple, backgroundColor: colors.surfaceDeep }]}>
            <Ionicons name="flash" size={26} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityLabel, { color: colors.purple }]}>CURRENT PERSONA</Text>
            <Text style={[styles.identityName, { color: colors.foreground }]}>{draft.name.trim() || 'Leo'}</Text>
            <Text style={[styles.identityMeta, { color: colors.mutedForeground }]}>EDITABLE · SAVED ON THIS DEVICE</Text>
          </View>
        </View>

        <View style={styles.form}>
          {fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={[styles.label, { color: colors[field.accent] }]}>{field.label}</Text>
              <TextInput
                value={draft[field.key] ?? ''}
                onChangeText={(value) => updateField(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                multiline={field.multiline}
                editable={!isLoading}
                textAlignVertical={field.multiline ? 'top' : 'center'}
                maxLength={field.maxLength}
                style={[
                  styles.input,
                  field.multiline && styles.multiline,
                  { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input },
                ]}
                testID={`input-persona-${field.key}`}
              />
            </View>
          ))}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          {saved ? <Text style={[styles.saved, { color: colors.cyan }]}>PROFILE SAVED ON THIS DEVICE</Text> : null}
          <NeonButton label="Save persona" icon="save-outline" color="pink" onPress={() => void save()} disabled={isLoading} />

          <View style={[styles.promptCard, { borderColor: colors.border, backgroundColor: colors.surfaceDeep }]}>
            <Text style={[styles.promptLabel, { color: colors.gold }]}>CONVERSATION CONTEXT</Text>
            <Text selectable style={[styles.promptText, { color: colors.mutedForeground }]} numberOfLines={12}>
              {buildSystemPrompt(previewData)}
            </Text>
            <NeonButton label="Copy prompt for another app" icon="copy-outline" color="gold" onPress={() => void copyPrompt()} />
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  identity: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 54, height: 54, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  identityLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.3, marginBottom: 4 },
  identityName: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  identityMeta: { fontFamily: 'Menlo', fontSize: 8, marginTop: 4, letterSpacing: 0.3 },
  form: { gap: 13 },
  field: { gap: 7 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11, fontFamily: 'Inter_400Regular', fontSize: 13 },
  multiline: { minHeight: 82, lineHeight: 19 },
  saved: { fontFamily: 'Menlo', fontSize: 9, textAlign: 'center', letterSpacing: 1 },
  promptCard: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 11, marginTop: 5 },
  promptLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },
  promptText: { fontFamily: 'Menlo', fontSize: 10, lineHeight: 15 },
});
