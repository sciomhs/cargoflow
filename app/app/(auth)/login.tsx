import { Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { isLocalServer, TEST_PASSWORD, testAccounts } from '@/api/accounts';
import { serverConfigured, signInServer } from '@/api/repository';
import { FormError } from '@/components/form';
import { demoUsers, type Role, useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { tripDestination } from '@/navigation/routes';
import { Button, Field, Row, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { icon, spacing } from '@/ui/tokens';

export default function LoginScreen() {
  const demoMode = useSettings((state) => state.demoMode);
  const setDemoMode = useSettings((state) => state.setDemoMode);
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}>
          <View className="mx-auto w-full max-w-xl flex-1 px-4 pt-6" style={{ gap: spacing.lg }}>
            <Text accessibilityRole="header" size="title">CargoFlow</Text>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button label="Демо без сети" variant={demoMode ? 'primary' : 'secondary'} accessibilityRole="tab"
                accessibilityState={{ selected: demoMode }} onPress={() => setDemoMode(true)} /></View>
              <View style={{ flex: 1 }}><Button label="Вход по логину" variant={demoMode ? 'secondary' : 'primary'} accessibilityRole="tab"
                accessibilityState={{ selected: !demoMode }} onPress={() => setDemoMode(false)} /></View>
            </View>
            {demoMode ? <DemoLogin /> : <ServerLogin />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function openTripIfAsked(role: Role, trip: string | string[] | undefined) {
  if (typeof trip === 'string' && trip.length > 0) router.replace(tripDestination(role, trip), { withAnchor: true });
}

function DemoLogin() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const signIn = useSession((state) => state.signIn);
  const { colors } = useTheme();
  const { trip } = useLocalSearchParams<{ trip?: string | string[] }>();
  return <View style={{ gap: spacing.lg, flex: 1 }}>
    <Text size="small" tone="muted">Данные хранятся на этом устройстве. Сервер и интернет не нужны.</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Роль">
      {demoUsers.map((user) => (
        <Row key={user.role} label={user.title} detail={user.userName} accessibilityRole="radio"
          accessibilityState={{ checked: selectedRole === user.role }} selected={selectedRole === user.role}
          onPress={() => setSelectedRole(user.role)}
          trailing={selectedRole === user.role && <Check {...icon} color={colors.accentText} />} />
      ))}
    </View>
    <View className="min-h-8 flex-1" />
    <Button label="Войти" disabled={selectedRole === null} onPress={() => {
      if (!selectedRole) return;
      signIn(selectedRole);
      openTripIfAsked(selectedRole, trip);
    }} />
  </View>;
}

function ServerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const signInAccount = useSession((state) => state.signInAccount);
  const { trip } = useLocalSearchParams<{ trip?: string | string[] }>();
  const local = isLocalServer();
  const submit = async () => {
    if (!email.trim() || !password) { setError('Введите email и пароль'); return; }
    setPending(true);
    setError(undefined);
    try {
      const account = await signInServer(email, password);
      signInAccount(account);
      openTripIfAsked(account.role, trip);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setPending(false);
    }
  };
  if (!serverConfigured()) return <View style={{ gap: spacing.md }}>
    <Text>Сервер не настроен.</Text>
    <Text size="small" tone="muted">Запустите локальный Supabase и выполните node setup/local-backend.mjs, затем перезапустите Metro. Подробности в README.</Text>
  </View>;
  return <View style={{ gap: spacing.lg }}>
    <Text size="small" tone="muted">Сервер: {process.env.EXPO_PUBLIC_SUPABASE_URL}. Роль и права берутся из профиля в базе.</Text>
    <Field testID="login-email" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
      keyboardType="email-address" autoComplete="email" textContentType="username" placeholder="dispatcher@cargoflow.test" />
    <Field testID="login-password" label="Пароль" value={password} onChangeText={setPassword} secureTextEntry
      autoComplete="password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
    <FormError message={error} />
    <Button label={pending ? 'Входим…' : 'Войти'} disabled={pending} onPress={submit} />
    {local && <View style={{ gap: spacing.sm }}>
      <Text size="small" tone="muted">Тестовые учётные записи локального сервера, пароль {TEST_PASSWORD}:</Text>
      {testAccounts.map((account) => <Row key={account.email} label={`${account.title}: ${account.name}`} detail={account.email} detailMono
        onPress={() => { setEmail(account.email); setPassword(TEST_PASSWORD); setError(undefined); }} />)}
    </View>}
  </View>;
}
