import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Открыть рейс', href: { pathname: '/(dispatcher)/trips/[id]', params: {"id": "preview"} } },
    ]} />
  );
}
