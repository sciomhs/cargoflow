import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Рейсы водителя', href: { pathname: '/(manager)/drivers/[id]', params: {"id": "preview"} } },
    ]} />
  );
}
