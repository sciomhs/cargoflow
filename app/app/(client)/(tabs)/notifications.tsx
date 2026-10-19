import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Открыть доставку', href: { pathname: '/(client)/deliveries/[id]', params: {"id": "preview"} } },
    ]} />
  );
}
