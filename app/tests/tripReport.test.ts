import { expect, test } from 'vitest';
import { tripReportHtml } from '../src/features/report/tripReport';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';
import { DemoStore } from '../src/demo/store';
import { memoryStorage } from '../src/demo/persist';
import { data, demoUser } from '../src/demo/data';

test('PDF-акт: события, номер, кириллица, экранирование; клиенту без водителя и служебных событий', async () => {
  const store = new DemoStore(memoryStorage());
  const r648 = data.trips.find((trip) => trip.number === 'R-648')!;
  const dispatcherView = await new DemoTripRepository(demoUser('dispatcher'), store).get(r648.id);
  const html = tripReportHtml({ ...dispatcherView, order: { ...dispatcherView.order, cargo_name: 'Плитка <b>&</b>' } });
  expect(html).toContain('Акт выполненного рейса R-648');
  expect(html).toContain('Плитка &lt;b&gt;&amp;&lt;/b&gt;');
  expect(html).toContain('Асхат Нуртаев');
  expect(html).toContain('Сообщение о проблеме');
  expect(html).toContain('<meta charset="utf-8"/>');
  const clientView = await new DemoTripRepository(demoUser('client'), store).get(r648.id);
  const clientHtml = tripReportHtml(clientView);
  expect(clientHtml).not.toContain('Асхат');
  expect(clientHtml).not.toContain('Сообщение о проблеме');
  expect(clientHtml).not.toContain('Закрытие дороги');
});
