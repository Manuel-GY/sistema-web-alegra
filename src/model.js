export const STORAGE_KEY = 'alegra-demo-v1';
export const money = (value) => new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
}).format(value);
export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const id = () => crypto.randomUUID();

export function seed() {
  const products = [
    { id: 'gua', name: 'Origen Guatemala', category: 'Café de origen', format: '250 g · Grano', price: 14500, cost: 8000, stock: 24, min: 8, tone: 'gold', sku: 'ALG-GUA-250' },
    { id: 'bol', name: 'Origen Bolivia', category: 'Café de origen', format: '250 g · Molido', price: 12000, cost: 6500, stock: 6, min: 8, tone: 'green', sku: 'ALG-BOL-250' },
    { id: 'col', name: 'Origen Colombia', category: 'Café de origen', format: '250 g · Grano', price: 13000, cost: 7000, stock: 32, min: 8, tone: 'rust', sku: 'ALG-COL-250' },
    { id: 'ave', name: 'Praliné Avellana', category: 'Sabores de autor', format: '250 g · Molido', price: 14000, cost: 7500, stock: 18, min: 6, tone: 'olive', sku: 'ALG-AVE-250' },
    { id: 'nue', name: 'Praliné Nuez', category: 'Sabores de autor', format: '100 g · Molido', price: 7000, cost: 3500, stock: 4, min: 6, tone: 'brown', sku: 'ALG-NUE-100' },
    { id: 'pis', name: 'Praliné Pistacho', category: 'Sabores de autor', format: '100 g · Molido', price: 7000, cost: 3800, stock: 0, min: 6, tone: 'green', sku: 'ALG-PIS-100' },
  ];
  const customers = [
    { id: 'c1', name: 'Cliente de ejemplo A', email: 'cliente.a@example.com', phone: '', type: 'Minorista' },
    { id: 'c2', name: 'Cafetería de ejemplo', email: 'cafeteria@example.com', phone: '', type: 'Negocio' },
    { id: 'c3', name: 'Cliente de ejemplo B', email: 'cliente.b@example.com', phone: '', type: 'Minorista' },
  ];
  const sales = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(i / 4));
    date.setHours(17 - (i % 4) * 2, (3 - i % 4) * 13, 0, 0);
    if (date > new Date()) date.setTime(Date.now() - (i + 1) * 60000);
    const product = products[i % 5];
    const quantity = 1 + i % 3;
    return {
      id: `demo-${i}`, number: 1028 - i, date: date.toISOString(),
      customerId: customers[i % 3].id,
      customerName: customers[i % 3].name,
      payment: ['Tarjeta', 'Efectivo', 'Transferencia'][i % 3],
      items: [{ productId: product.id, name: product.name, quantity, price: product.price, cost: product.cost }],
      total: product.price * quantity,
    };
  });
  return {
    products, customers, sales, movements: [], cash: { open: true, opening: 50000, openedAt: new Date().toISOString(), closedAt: null, counted: null },
    suppliers: [
      { id: 's1', name: 'Proveedor de café · Demo', category: 'Café e insumos', email: 'cafe@example.com', phone: '', status: 'Activo' },
      { id: 's2', name: 'Envases y etiquetas · Demo', category: 'Empaques', email: 'envases@example.com', phone: '', status: 'Activo' },
    ],
  };
}

export function loadState(storage) {
  try {
    const state = JSON.parse(storage.getItem(STORAGE_KEY));
    if (state && ['products', 'customers', 'sales', 'movements', 'suppliers'].every((key) => Array.isArray(state[key])) &&
      typeof state.cash?.open === 'boolean' && Number.isFinite(state.cash.opening)) return state;
  } catch { /* A damaged or unavailable storage starts a fresh demo. */ }
  return seed();
}

export function completeSale(state, cart, customerId, payment) {
  if (!state.cash.open) throw new Error('Abre la caja antes de registrar una venta.');
  if (!['Efectivo', 'Tarjeta', 'Transferencia'].includes(payment)) throw new Error('Selecciona un medio de pago válido.');
  if (!cart.length) throw new Error('Agrega al menos un producto.');
  const quantities = new Map();
  for (const line of cart) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error('La cantidad debe ser un entero positivo.');
    quantities.set(line.productId, (quantities.get(line.productId) || 0) + line.quantity);
  }
  const items = [...quantities].map(([productId, quantity]) => {
    const product = state.products.find((p) => p.id === productId);
    if (!product || product.stock < quantity) throw new Error('Stock insuficiente para completar la venta.');
    return { productId, name: product.name, quantity, price: product.price, cost: product.cost };
  });
  const customer = state.customers.find((c) => c.id === customerId);
  const sale = {
    id: id(), number: Math.max(1000, ...state.sales.map((s) => s.number)) + 1,
    date: new Date().toISOString(), customerId: customer?.id || '', customerName: customer?.name || 'Venta de mostrador',
    payment, items, total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
  return {
    ...state,
    products: state.products.map((p) => ({ ...p, stock: p.stock - (quantities.get(p.id) || 0) })),
    sales: [sale, ...state.sales],
  };
}

export function adjustStock(state, productId, quantity, reason) {
  const product = state.products.find((p) => p.id === productId);
  if (!product || !Number.isSafeInteger(quantity) || quantity === 0 || product.stock + quantity < 0) {
    throw new Error('Ingresa un movimiento entero distinto de cero que no deje stock negativo.');
  }
  if (!reason.trim()) throw new Error('Indica el motivo del movimiento.');
  return {
    ...state,
    products: state.products.map((p) => p.id === productId ? { ...p, stock: p.stock + quantity } : p),
    movements: [{ id: id(), productId, name: product.name, quantity, reason: reason.trim(), date: new Date().toISOString() }, ...state.movements],
  };
}

export function cashExpected(state) {
  return state.cash.opening + state.sales
    .filter((s) => s.payment === 'Efectivo' && s.date >= state.cash.openedAt && (!state.cash.closedAt || s.date <= state.cash.closedAt))
    .reduce((sum, s) => sum + s.total, 0);
}

export function periodSales(sales, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return sales.filter((sale) => new Date(sale.date) >= start && new Date(sale.date) <= new Date());
}

export function csv(rows) {
  return '\uFEFF' + rows.map((row) => row.map((cell) => {
    const text = String(cell ?? '');
    const safe = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(';')).join('\r\n');
}
