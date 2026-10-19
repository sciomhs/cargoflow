import NavigationLinks from '@/components/navigation-links';

export default function Screen() {
  return (
    <NavigationLinks links={[
      { label: 'Создать заказ', href: { pathname: '/(dispatcher)/orders/new' } },
      { label: 'Открыть заказ', href: { pathname: '/(dispatcher)/orders/[id]', params: {"id": "preview"} } },
    ]} />
  );
}
