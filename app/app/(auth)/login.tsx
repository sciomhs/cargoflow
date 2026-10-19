import { Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { demoUsers, type Role, useSession } from '@/store/session';
import { tripDestination } from '@/navigation/routes';
import { Button, Row, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { icon, spacing } from '@/ui/tokens';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const signIn = useSession((state) => state.signIn);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { trip } = useLocalSearchParams<{ trip?: string | string[] }>();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}>
        <View className="mx-auto w-full max-w-xl flex-1 px-4 pt-6">
          <Text accessibilityRole="header" size="title" style={{ marginBottom: spacing.xxl }}>CargoFlow</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Роль">
            {demoUsers.map((user) => (
              <Row key={user.role}
                label={user.title} detail={user.userName}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedRole === user.role }}
                selected={selectedRole === user.role}
                onPress={() => setSelectedRole(user.role)}
                trailing={selectedRole === user.role && <Check {...icon} color={colors.accentText} />}
              />
            ))}
          </View>
          <View className="min-h-8 flex-1" />
          <Button label="Войти" disabled={selectedRole === null} onPress={() => {
            if (!selectedRole) return;
            signIn(selectedRole);
            if (typeof trip === 'string' && trip.length > 0) {
              router.replace(tripDestination(selectedRole, trip), { withAnchor: true });
            }
          }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
