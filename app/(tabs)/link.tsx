import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ErrorNotice, LocalNotice, NeonButton, Page, PageHeading } from '@/components/CrashPadUI';
import { useCrashPad } from '@/data/CrashPadContext';
import { useColors } from '@/hooks/useColors';

export default function LinkScreen() {
  const colors = useColors();
  const {
    data,
    isLoading,
    error,
    credentialError,
    hasApiKey,
    secureStorageAvailable,
    saveProvider,
    saveApiKey,
    clearApiKey,
    memoryMachineUrl,
    hasMemoryMachineToken,
    memoryMachineError,
    saveMemoryMachineConnection,
    clearMemoryMachineToken,
    testMemoryMachineConnection,
  } = useCrashPad();
  const [apiBase, setApiBase] = useState(data.provider.apiBase);
  const [model, setModel] = useState(data.provider.model);
  const [keyDraft, setKeyDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [memoryUrlDraft, setMemoryUrlDraft] = useState(memoryMachineUrl);
  const [memoryTokenDraft, setMemoryTokenDraft] = useState('');
  const [memorySaved, setMemorySaved] = useState(false);
  const [memoryTesting, setMemoryTesting] = useState(false);
  const [memoryTestResult, setMemoryTestResult] = useState('');

  useEffect(() => {
    setApiBase(data.provider.apiBase);
    setModel(data.provider.model);
  }, [data.provider]);

  useEffect(() => {
    setMemoryUrlDraft(memoryMachineUrl);
  }, [memoryMachineUrl]);

  const connectionReady = secureStorageAvailable && hasApiKey && Boolean(data.provider.model.trim());
  const save = async () => {
    setFormError('');
    setSaved(false);
    let parsed: URL;
    try {
      parsed = new URL(apiBase.trim());
    } catch {
      setFormError('Enter a valid API base URL.');
      return;
    }
    if (parsed.protocol !== 'https:') {
      setFormError('Use an HTTPS address so your API key is never sent in plain text.');
      return;
    }
    const settingsSaved = await saveProvider({ apiBase: apiBase.trim().replace(/\/+$/, ''), model: model.trim() });
    if (!settingsSaved) return;
    if (keyDraft.trim()) {
      const keySaved = await saveApiKey(keyDraft.trim());
      if (!keySaved) return;
      setKeyDraft('');
    }
    setSaved(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmRemoveKey = () =>
    Alert.alert('Remove the saved API key?', 'This deletes the key from this device. It is not included in backups.', [
      { text: 'Keep key', style: 'cancel' },
      { text: 'Remove key', onPress: () => void clearApiKey() },
    ]);

  const saveMemoryLink = async () => {
    setMemorySaved(false);
    setMemoryTestResult('');
    const ok = await saveMemoryMachineConnection(memoryUrlDraft, memoryTokenDraft);
    if (!ok) return;
    setMemoryTokenDraft('');
    setMemorySaved(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const testMemoryLink = async () => {
    setMemoryTesting(true);
    setMemoryTestResult('');
    try {
      const count = await testMemoryMachineConnection();
      setMemoryTestResult(count
        ? `Connection works · ${count} recent message${count === 1 ? '' : 's'} returned.`
        : 'The service responded; no recent messages were returned.');
    } catch {
      // The connection error is displayed in the red status notice below.
    } finally {
      setMemoryTesting(false);
    }
  };

  const confirmRemoveMemoryToken = () =>
    Alert.alert('Remove the Memory Machine token?', 'This removes the saved token from this device.', [
      { text: 'Keep token', style: 'cancel' },
      { text: 'Remove token', onPress: () => void clearMemoryMachineToken() },
    ]);

  return (
    <Page>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <PageHeading
          eyebrow="LINK // MODEL & MEMORY"
          title="Connect your model."
          detail="Set up the service that answers messages. The xAI address from your app files is already filled in."
          accent="gold"
        />

        <View style={[styles.guide, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.guideTitle, { color: colors.gold }]}>FIRST-TIME SETUP · 3 STEPS</Text>
          <Text style={[styles.guideLine, { color: colors.foreground }]}>
            <Text style={{ color: colors.cyan }}>01  </Text>Leave the prefilled xAI address as it is unless you use a different provider.
          </Text>
          <Text style={[styles.guideLine, { color: colors.foreground }]}>
            <Text style={{ color: colors.cyan }}>02  </Text>Copy your model’s current name from your provider account or its official model list.
          </Text>
          <Text style={[styles.guideLine, { color: colors.foreground }]}>
            <Text style={{ color: colors.cyan }}>03  </Text>Enter your API key here and save. You do not need to edit code.
          </Text>
        </View>

        <LocalNotice>
          Your API key is stored in iOS/Android secure storage and is never part of a backup. Chat requests send your persona, memories, saved conversation notes, and recent thread to the endpoint below.
        </LocalNotice>
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        {credentialError ? <ErrorNotice>{credentialError}</ErrorNotice> : null}
        {formError ? <ErrorNotice>{formError}</ErrorNotice> : null}
        {!secureStorageAvailable ? (
          <LocalNotice>Secure API-key storage requires the native iOS or Android app; keys cannot be saved from a web preview.</LocalNotice>
        ) : null}

        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: connectionReady ? colors.cyan : colors.gold }]}>
          <Ionicons name={connectionReady ? 'radio' : 'radio-outline'} size={20} color={connectionReady ? colors.cyan : colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: connectionReady ? colors.cyan : colors.gold }]}>
              {connectionReady ? 'MODEL LINK READY' : 'MODEL LINK NEEDS SETUP'}
            </Text>
            <Text style={[styles.statusDetail, { color: colors.mutedForeground }]}>
              {hasApiKey ? 'API key stored securely on this device' : 'No key is stored yet'}
              {data.provider.model.trim() ? ` · ${data.provider.model}` : ' · model ID needed'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.cyan }]}>API BASE URL</Text>
          <Text style={[styles.fieldHelp, { color: colors.mutedForeground }]}>Where chat requests are sent. Only change this if you trust a different provider.</Text>
          <TextInput
            value={apiBase}
            onChangeText={setApiBase}
            placeholder="https://api.x.ai/v1"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            testID="input-api-base"
          />

          <Text style={[styles.label, { color: colors.gold }]}>MODEL ID</Text>
          <Text style={[styles.fieldHelp, { color: colors.mutedForeground }]}>Model names and prices change; use the current name from your provider.</Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="Paste the current model ID from the provider"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            testID="input-model-id"
          />

          <Text style={[styles.label, { color: colors.pink }]}>API KEY</Text>
          <Text style={[styles.fieldHelp, { color: colors.mutedForeground }]}>Your provider may charge for every message. Consider setting a spending limit there.</Text>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder={hasApiKey ? 'Saved securely · enter a new key to replace it' : 'Enter your provider key on your device'}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={secureStorageAvailable}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            testID="input-api-key"
            accessibilityLabel="Provider API key"
          />
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            Requests go directly from this device to the endpoint you choose. Never paste an API key into chat or a backup file. Set a spending cap with your provider.
          </Text>

          {saved ? <Text style={[styles.saved, { color: colors.cyan }]}>LINK SETTINGS SAVED</Text> : null}
          <NeonButton label="Save link settings" icon="save-outline" color="gold" onPress={() => void save()} disabled={isLoading || !secureStorageAvailable} />
          {hasApiKey ? <NeonButton label="Remove saved API key" icon="key-outline" color="pink" onPress={confirmRemoveKey} /> : null}
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>MEMORY MACHINE // CONVERSATION CONTINUITY</Text>
        <View style={[styles.futureCard, { borderColor: colors.border, backgroundColor: colors.surfaceDeep }]}>
          <Ionicons name={hasMemoryMachineToken ? 'link' : 'link-outline'} size={18} color={hasMemoryMachineToken ? colors.cyan : colors.gold} />
          <View style={{ flex: 1, gap: 9 }}>
            <Text style={[styles.futureTitle, { color: colors.foreground }]}>
              {hasMemoryMachineToken && memoryMachineUrl ? 'Memory link configured' : 'Connect Leo’s Memory Machine'}
            </Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Recent conversation context is fetched when chat opens. Memory search is used when you ask Leo to recall something. This does not write to the service.
            </Text>
            <LocalNotice>
              Enter the private service’s HTTPS address and bearer token here. The token is stored in device secure storage, never in backups. Recent messages and searches are sent to that service.
            </LocalNotice>
            {memoryMachineError ? <ErrorNotice>{memoryMachineError}</ErrorNotice> : null}
            <Text style={[styles.label, { color: colors.cyan }]}>PRIVATE MEMORY MACHINE HTTPS ADDRESS</Text>
            <TextInput
              value={memoryUrlDraft}
              onChangeText={(value) => { setMemoryUrlDraft(value); setMemorySaved(false); setMemoryTestResult(''); }}
              placeholder="https://your-private-service.example"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
              testID="input-memory-machine-url"
            />
            <Text style={[styles.label, { color: colors.pink }]}>MEMORY MACHINE TOKEN</Text>
            <TextInput
              value={memoryTokenDraft}
              onChangeText={setMemoryTokenDraft}
              placeholder={hasMemoryMachineToken ? 'Saved securely · enter a new token to replace' : 'Enter the private bearer token on this device'}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              editable={secureStorageAvailable}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
              testID="input-memory-machine-token"
              accessibilityLabel="Memory Machine access token"
            />
            {!secureStorageAvailable ? (
              <LocalNotice>Memory Machine credentials can only be saved in the native iOS or Android app.</LocalNotice>
            ) : null}
            {memorySaved ? <Text style={[styles.saved, { color: colors.cyan }]}>MEMORY LINK SETTINGS SAVED</Text> : null}
            {memoryTestResult ? <Text style={[styles.saved, { color: colors.cyan }]}>{memoryTestResult}</Text> : null}
            <NeonButton
              label="Save Memory Machine link"
              icon="save-outline"
              color="gold"
              onPress={() => void saveMemoryLink()}
              disabled={isLoading || !secureStorageAvailable}
            />
            <NeonButton
              label={memoryTesting ? 'Testing connection…' : 'Test Memory Machine connection'}
              icon="pulse-outline"
              color="cyan"
              onPress={() => void testMemoryLink()}
              disabled={memoryTesting || !memoryMachineUrl || !hasMemoryMachineToken}
            />
            {hasMemoryMachineToken ? (
              <NeonButton label="Remove saved Memory Machine token" icon="key-outline" color="pink" onPress={confirmRemoveMemoryToken} />
            ) : null}
          </View>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>FUTURE APP LINKS</Text>
        <View style={[styles.futureCard, { borderColor: colors.border, backgroundColor: colors.surfaceDeep }]}>
          <Ionicons name="time-outline" size={18} color={colors.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.futureTitle, { color: colors.foreground }]}>AIs and Ears</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>Reserved for its owner’s published perception API. No camera or microphone permissions are requested yet.</Text>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 13 },
  guide: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 8 },
  guideTitle: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3, marginBottom: 2 },
  guideLine: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  statusCard: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTitle: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  statusDetail: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  form: { gap: 9 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, marginTop: 5 },
  fieldHelp: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: -5 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11, fontFamily: 'Inter_400Regular', fontSize: 13 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  saved: { fontFamily: 'Menlo', fontSize: 9, textAlign: 'center', letterSpacing: 1 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, marginTop: 5 },
  futureCard: { borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  futureTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 4 },
});
