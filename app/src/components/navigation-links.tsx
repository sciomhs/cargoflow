import { Link, type Href } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Row } from '@/ui';
import { spacing } from '@/ui/tokens';

type Destination = { label: string; href: Href };

// shortcut: preview IDs cover navigation until feature screens connect repository data.
export default function NavigationLinks({ links }: { links: Destination[] }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
      {links.map(({ label, href }) => (
        <Link key={label} href={href} asChild>
          <Row
            accessibilityRole="link"
            accessibilityLabel={label}
            label={label}
          />
        </Link>
      ))}
    </ScrollView>
  );
}
