import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustStock, cashExpected, completeSale, csv, dayKey, loadState, periodSales, seed } from '../src/model.js';

test('una venta agrupa cantidades, respeta precios, guarda cliente y descuenta stock sin mutar el estado', () => {
  const state = seed();
  const next = completeSale(state, [{ productId: 'gua', quantity: 2 }, { productId: 'gua', quantity: 1 }], 'c1', 'Efectivo');
  assert.equal(next.products[0].stock, 21);
  assert.equal(state.products[0].stock, 24);
  assert.equal(next.sales[0].total, 43500);
  assert.equal(next.sales[0].customerName, state.customers[0].name);
  assert.equal(next.sales[0].items.length, 1);
  assert.equal(next.sales[0].items[0].quantity, 3);
  assert.equal(next.sales[0].number, 1029);
  assert.equal(next.sales[0].items[0].cost, 8000);
});

test('rechaza carrito vacío, cantidades fraccionarias, stock insuficiente, pago inválido y caja cerrada', () => {
  const state = seed();
  assert.throws(() => completeSale(state, [], '', 'Tarjeta'), /al menos/);
  for (const quantity of [-1, 0, 1.5, NaN, Infinity]) {
    assert.throws(() => completeSale(state, [{ productId: 'gua', quantity }], '', 'Tarjeta'), /entero/);
  }
  assert.throws(() => completeSale(state, [{ productId: 'gua', quantity: 13 }, { productId: 'gua', quantity: 13 }], '', 'Tarjeta'), /Stock insuficiente/);
  assert.throws(() => completeSale(state, [{ productId: 'pis', quantity: 1 }], '', 'Tarjeta'), /Stock insuficiente/);
  assert.throws(() => completeSale(state, [{ productId: 'missing', quantity: 1 }], '', 'Tarjeta'), /Stock insuficiente/);
  assert.throws(() => completeSale(state, [{ productId: 'gua', quantity: 1 }], '', 'Otro'), /pago válido/);
  assert.throws(() => completeSale({ ...state, cash: { ...state.cash, open: false } }, [{ productId: 'gua', quantity: 1 }], '', 'Tarjeta'), /Abre la caja/);
});

test('el último producto se puede vender y el histórico conserva su precio y costo', () => {
  const state = seed();
  const next = completeSale(state, [{ productId: 'nue', quantity: 4 }], '', 'Transferencia');
  assert.equal(next.products.find((p) => p.id === 'nue').stock, 0);
  next.products.find((p) => p.id === 'nue').price = 100;
  assert.equal(next.sales[0].total, 28000);
  assert.equal(next.sales[0].items[0].cost, 3500);
  assert.equal(next.sales[0].customerName, 'Venta de mostrador');
});

test('los movimientos registran entradas y mermas y rechazan stock negativo o motivos vacíos', () => {
  const state = seed();
  const entry = adjustStock(state, 'pis', 10, '  Compra demo  ');
  assert.equal(entry.products.find((p) => p.id === 'pis').stock, 10);
  assert.equal(entry.movements[0].reason, 'Compra demo');
  const exit = adjustStock(entry, 'pis', -10, 'Merma demo');
  assert.equal(exit.products.find((p) => p.id === 'pis').stock, 0);
  assert.equal(exit.movements.length, 2);
  assert.equal(state.movements.length, 0);
  assert.throws(() => adjustStock(state, 'pis', -1, 'Merma'), /stock negativo/);
  assert.throws(() => adjustStock(state, 'gua', 1, '  '), /motivo/);
  assert.throws(() => adjustStock(state, 'gua', .5, 'Compra'), /entero/);
  assert.throws(() => adjustStock(state, 'gua', 0, 'Compra'), /distinto de cero/);
});

test('el saldo de caja solo suma efectivo dentro de la sesión, incluido el límite de cierre', () => {
  const state = seed();
  state.cash = { opening: 10000, openedAt: '2026-10-27T09:00:00.000Z', closedAt: '2026-10-27T18:00:00.000Z', open: false };
  state.sales = [
    { date: '2026-10-27T08:59:59.000Z', payment: 'Efectivo', total: 9999 },
    { date: '2026-10-27T09:00:00.000Z', payment: 'Efectivo', total: 1000 },
    { date: '2026-10-27T11:00:00.000Z', payment: 'Tarjeta', total: 5000 },
    { date: '2026-10-27T18:00:00.000Z', payment: 'Efectivo', total: 2000 },
    { date: '2026-10-27T18:00:01.000Z', payment: 'Efectivo', total: 8888 },
  ];
  assert.equal(cashExpected(state), 13000);
});

test('la demo no genera ventas futuras y los filtros incluyen hoy sin depender de UTC', () => {
  const state = seed();
  assert.ok(state.sales.every((sale) => new Date(sale.date) <= new Date()));
  assert.equal(periodSales(state.sales, 7).length, 28);
  assert.equal(dayKey(new Date(2026, 9, 27, 23, 59)), '2026-10-27');
  assert.equal(periodSales([{ date: new Date().toISOString() }, { date: '2000-01-01' }, { date: '2099-01-01' }], 1).length, 1);
});

test('recupera datos guardados y reinicia almacenamiento dañado o inaccesible', () => {
  const state = seed();
  assert.deepEqual(loadState({ getItem: () => JSON.stringify(state) }), state);
  for (const stored of [null, '{}', 'invalid', '{"products":[]}']) {
    assert.equal(loadState({ getItem: () => stored }).products.length, 6);
  }
  assert.equal(loadState({ getItem: () => { throw new Error('Storage disabled'); } }).sales.length, 28);
});

test('la exportación CSV conserva caracteres y escapa comillas, separadores y fórmulas', () => {
  assert.equal(csv([['Café; origen', 'Dice "hola"', '=SUM(A1)', '+123', '@demo', '-10']]),
    '\uFEFF"Café; origen";"Dice ""hola""";"\'=SUM(A1)";"\'+123";"\'@demo";"\'-10"');
});
