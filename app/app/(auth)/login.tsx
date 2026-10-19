import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { demoUsers, type Role, useSession } from '@/store/session';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const signIn = useSession((state) => state.signIn);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}>
        <View className="mx-auto w-full max-w-xl flex-1 px-4 pt-6">
          <Text
            accessibilityRole="header"
            className="mb-8 text-left text-xl text-stone-900"
            style={{ fontFamily: 'IBMPlexSans_400Regular' }}>
            CargoFlow
          </Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Роль">
            {demoUsers.map((user) => (
              <Pressable
                key={user.role}
                accessibilityRole="radio"
                accessibilityLabel={`${user.title}, ${user.userName}`}
                accessibilityState={{ checked: selectedRole === user.role }}
                onPress={() => setSelectedRole(user.role)}
                className="min-h-14 flex-row items-center gap-4 border-b border-stone-300 py-4 active:bg-stone-100">
                <View className="flex-1 gap-1">
                  <Text className="text-base text-stone-900" style={{ fontFamily: 'IBMPlexSans_500Medium' }}>
                    {user.title}
                  </Text>
                  <Text className="text-sm text-stone-600" style={{ fontFamily: 'IBMPlexSans_400Regular' }}>
                    {user.userName}
                  </Text>
                </View>
                {selectedRole === user.role && <Check size={20} strokeWidth={1.75} color="black" />}
              </Pressable>
            ))}
          </View>
          <View className="min-h-8 flex-1" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Войти"
            accessibilityState={{ disabled: selectedRole === null }}
            disabled={selectedRole === null}
            onPress={() => { if (selectedRole) signIn(selectedRole); }}
            className="min-h-14 items-center justify-center rounded-[6px] bg-stone-900 px-4 py-4 active:opacity-70 disabled:opacity-40">
            <Text
              maxFontSizeMultiplier={1.3}
              className="text-base text-white"
              style={{ fontFamily: 'IBMPlexSans_500Medium' }}>
              Войти
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
