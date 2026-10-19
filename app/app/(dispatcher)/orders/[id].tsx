import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Создать рейс', href: { pathname: '/(dispatcher)/trips/new', params: {"order": "preview"} } },
    ]} />
  );
}
