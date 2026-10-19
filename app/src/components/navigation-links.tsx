import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Destination = { label: string; href: Href };

// shortcut: preview IDs cover navigation until feature screens connect repository data.
export default function NavigationLinks({ links }: { links: Destination[] }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
      {links.map(({ label, href }) => (
        <Link key={label} href={href} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={label}
            className="min-h-14 justify-center border-b border-stone-300 py-4 active:bg-stone-100">
            <Text className="text-base text-stone-900" style={{ fontFamily: 'IBMPlexSans_400Regular' }}>
              {label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
