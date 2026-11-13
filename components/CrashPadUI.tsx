import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function Page({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function PageHeading({
  eyebrow,
  title,
  detail,
  accent = 'purple',
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  accent?: 'purple' | 'cyan' | 'gold' | 'pink';
}) {
  const colors = useColors();
  return (
    <View style={styles.heading}>
      <Text style={[styles.eyebrow, { color: colors[accent] }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {detail ? (
        <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text>
      ) : null}
    </View>
  );
}

export function LocalNotice({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Ionicons name="hardware-chip-outline" size={17} color={colors.cyan} />
      <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.error, { borderColor: colors.error }]}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.error }]}>{children}</Text>
    </View>
  );
}

export function NeonButton({
  label,
  onPress,
  color = 'purple',
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  color?: 'purple' | 'cyan' | 'gold' | 'pink';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors[color], opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={colors[color]} /> : null}
      <Text style={[styles.buttonText, { color: colors[color] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  safe: { flex: 1 },
  heading: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 18 },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.5 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 8 },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  error: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, letterSpacing: 0.2 },
});
