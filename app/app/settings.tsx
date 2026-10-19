import NavigationLinks from '@/components/navigation-links';

export default function SettingsScreen() {
  return <NavigationLinks links={__DEV__ ? [{ label: 'Галерея компонентов', href: '/(dev)/ui-gallery' }] : []} />;
}
