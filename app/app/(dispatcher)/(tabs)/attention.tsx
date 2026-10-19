import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Открыть проблему', href: { pathname: '/(dispatcher)/problems/[id]', params: {"id": "preview"} } },
    ]} />
  );
}
