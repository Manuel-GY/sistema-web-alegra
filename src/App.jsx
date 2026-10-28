import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Bell, Check,
  ChevronDown, ChevronRight, CircleHelp, Coffee, CreditCard, Download,
  LayoutDashboard, Leaf, Menu, Minus, Package, Plus, Search, Settings2, ShoppingBag,
  ShoppingCart, SlidersHorizontal, Sprout, Truck, Users, Wallet, X,
} from 'lucide-react';
import { adjustStock, cashExpected, completeSale, csv, dayKey, id, loadState, money, periodSales, seed, STORAGE_KEY } from './model.js';

const navigation = [
  ['dashboard', 'Resumen general', LayoutDashboard], ['inventory', 'Inventario', Package],
  ['sales', 'Ventas', ShoppingBag], ['customers', 'Clientes', Users],
  ['suppliers', 'Proveedores', Truck], ['cash', 'Caja', Wallet], ['reports', 'Reportes', BarChart3],
];
const dateTime = (date) => new Date(date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const totalOf = (sales) => sales.reduce((sum, sale) => sum + sale.total, 0);
const lowStock = (product) => product.stock <= product.min;

function Badge({ children, tone = 'green' }) {
  return <span className={`badge ${tone}`}><span />{children}</span>;
}

function Bag({ tone = 'gold', small = false }) {
  return <div className={`bag-art ${tone} ${small ? 'small' : ''}`} aria-hidden="true"><div className="bag-seam" /><div className="bag-label"><Sprout /><span>ALEGRA</span><i>café de especialidad</i></div></div>;
}

function Empty({ title = 'Sin resultados', text = 'Prueba con otra búsqueda o agrega un registro.' }) {
  return <div className="empty"><Search size={30} /><h3>{title}</h3><p>{text}</p></div>;
}

function Metric({ label, value, note, icon: Icon, tone = 'gold' }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19} /></span></div><strong>{value}</strong><p>{note}</p></article>;
}

function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" className={wide ? 'wide' : ''} onCancel={onClose} onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="dialog-content"><div className="dialog-heading"><div><span className="eyebrow">ALEGRA · DEMOSTRACIÓN</span><h2 id="dialog-title">{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Cerrar ventana"><X /></button></div>{children}</div>
  </dialog>;
}

function SalesTable({ sales, onSelect }) {
  return sales.length ? <div className="table-scroll"><table><thead><tr><th>Venta</th><th>Cliente</th><th>Fecha</th><th>Medio de pago</th><th>Total</th><th>Estado</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>
    {sales.map((sale) => <tr key={sale.id}><td><button className="text-button sale-number" onClick={() => onSelect(sale)}>#{sale.number}</button></td><td>{sale.customerName}</td><td className="muted nowrap">{dateTime(sale.date)}</td><td><span className="payment"><CreditCard size={14} />{sale.payment}</span></td><td className="amount">{money(sale.total)}</td><td><Badge>Completada</Badge></td><td><button className="icon-btn" onClick={() => onSelect(sale)} aria-label={`Ver venta ${sale.number}`}><ChevronRight size={17} /></button></td></tr>)}
  </tbody></table></div> : <Empty title="Todavía no hay ventas" text="Las ventas que simules aparecerán aquí." />;
}

function RevenueChart({ sales, days = 7 }) {
  const points = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    const daily = sales.filter((s) => dayKey(s.date) === dayKey(date));
    return { label: date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }), total: totalOf(daily) };
  });
  const max = Math.max(1000, ...points.map((p) => p.total));
  return <div className={`chart ${days > 7 ? 'dense' : ''}`} role="img" aria-label={`Ventas de los últimos ${days} días: ${money(totalOf(periodSales(sales, days)))}`}>
    <div className="chart-axis"><span>{money(max)}</span><span>{money(max / 2)}</span><span>$0</span></div>
    <div className="chart-plot"><div className="chart-grid"><i /><i /><i /></div><div className="chart-bars">{points.map((point, index) => <div className="chart-column" key={index}><div className={`chart-bar ${index === points.length - 1 ? 'current' : ''}`} style={{ height: `${Math.max(1, point.total / max * 100)}%` }} title={`${point.label}: ${money(point.total)}`}><span className="chart-tooltip">{money(point.total)}</span></div><small>{point.label}</small></div>)}</div></div>
  </div>;
}

function SaleForm({ state, onComplete, onClose }) {
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState('Tarjeta');
  const [error, setError] = useState('');
  const quantityOf = (productId) => cart.find((line) => line.productId === productId)?.quantity || 0;
  const changeQuantity = (product, delta) => {
    const quantity = quantityOf(product.id) + delta;
    if (quantity > product.stock) return;
    setCart((current) => [...current.filter((line) => line.productId !== product.id), ...(quantity > 0 ? [{ productId: product.id, quantity }] : [])]);
    setError('');
  };
  const total = cart.reduce((sum, line) => sum + state.products.find((p) => p.id === line.productId).price * line.quantity, 0);
  return <Dialog title="Nueva venta" onClose={onClose} wide><form onSubmit={(event) => {
    event.preventDefault();
    try { onComplete(completeSale(state, cart, customer, payment)); } catch (e) { setError(e.message); }
  }}>
    <div className="pos-grid"><section><label className="search-field"><Search size={17} /><input autoFocus aria-label="Buscar producto para venta" placeholder="Buscar un café..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <div className="pos-products">{state.products.filter((p) => `${p.name} ${p.format}`.toLowerCase().includes(query.toLowerCase())).map((product) => <button type="button" className="pos-product" key={product.id} disabled={quantityOf(product.id) >= product.stock} onClick={() => changeQuantity(product, 1)}><Bag tone={product.tone} small /><span><strong>{product.name}</strong><small>{product.format}</small><b>{money(product.price)}</b><small>{product.stock ? `${product.stock - quantityOf(product.id)} disponibles` : 'Sin stock'}</small></span><Plus size={16} /></button>)}</div>
    </section><section className="pos-cart"><h3>Detalle de la venta <span className="count">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span></h3>
      <label>Cliente<select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">Venta de mostrador</option>{state.customers.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <div className="cart-lines">{cart.length ? cart.map((line) => {
        const product = state.products.find((p) => p.id === line.productId);
        return <div className="cart-line" key={line.productId}><div><strong>{product.name}</strong><small>{money(product.price)} c/u</small></div><div className="stepper"><button type="button" aria-label={`Quitar ${product.name}`} onClick={() => changeQuantity(product, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" aria-label={`Sumar ${product.name}`} disabled={line.quantity >= product.stock} onClick={() => changeQuantity(product, 1)}><Plus size={13} /></button></div></div>;
      }) : <p className="cart-empty">Selecciona productos para comenzar.</p>}</div>
      <label>Medio de pago<select value={payment} onChange={(e) => setPayment(e.target.value)}><option>Tarjeta</option><option>Efectivo</option><option>Transferencia</option></select></label>
      <div className="cart-total"><span>Total <small>IVA incluido</small></span><strong>{money(total)}</strong></div>
      <p className="form-note">Simulación local: no cobra dinero ni emite documentos tributarios.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {!state.cash.open && <p className="error">La caja está cerrada. Ábrela en la sección Caja.</p>}
      <button className="btn primary full" disabled={!cart.length || !state.cash.open}><Check size={17} />Registrar venta demo</button>
    </section></div>
  </form></Dialog>;
}

export default function App() {
  const [state, setState] = useState(() => {
    try { return loadState(window.localStorage); } catch { return seed(); }
  });
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [days, setDays] = useState(7);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formError, setFormError] = useState('');
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `Alegra · ${navigation.find(([key]) => key === page)?.[1] || 'Gestión'}`;
  }, [page]);
  const go = (next) => { setPage(next); setSearch(''); setFilter('Todos'); setMobileMenu(false); };
  const open = (type, data) => { setFormError(''); setModal({ type, data }); };
  const save = (next, message) => { setState(next); setModal(null); setToast(message); };
  const alerts = state.products.filter(lowStock);
  const todaySales = state.sales.filter((s) => dayKey(s.date) === dayKey());
  const filteredSales = periodSales(state.sales, days).filter((s) => `${s.number} ${s.customerName} ${s.payment}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'Todos' || s.payment === filter));
  const visibleProducts = state.products.filter((p) => `${p.name} ${p.sku} ${p.format}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'Todos' || (filter === 'Stock bajo' ? lowStock(p) : p.category === filter)));
  const title = navigation.find(([key]) => key === page)?.[1];
  const exportRows = () => {
    const rows = page === 'inventory' ? [
      ['SKU', 'Producto', 'Formato', 'Precio CLP', 'Costo demo CLP', 'Stock', 'Stock mínimo'],
      ...visibleProducts.map((p) => [p.sku, p.name, p.format, p.price, p.cost, p.stock, p.min]),
    ] : page === 'customers' ? [
      ['Cliente', 'Email', 'Teléfono', 'Tipo'],
      ...state.customers.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase())).map((c) => [c.name, c.email, c.phone, c.type]),
    ] : [
      ['Venta', 'Fecha', 'Cliente', 'Medio de pago', 'Total CLP'],
      ...filteredSales.map((s) => [s.number, s.date, s.customerName, s.payment, s.total]),
    ];
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = `alegra-demo-${page}-${dayKey()}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Archivo CSV de demostración exportado.');
  };
  const searchField = (placeholder) => <label className="search-field"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} /></label>;
  const periodSelect = <label className="period-select"><span className="sr-only">Período</span><select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={1}>Hoy</option><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option></select><ChevronDown size={14} /></label>;

  function submitRecord(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const name = fields.name?.trim();
    if (!name) { setFormError('El nombre es obligatorio.'); return; }
    const existing = modal.data;
    if (modal.type === 'product') {
      const product = { ...fields, name, id: existing?.id || id(), price: Number(fields.price), cost: Number(fields.cost), stock: existing?.stock ?? Number(fields.stock), min: Number(fields.min), tone: existing?.tone || 'gold', sku: fields.sku.trim(), format: fields.format.trim() };
      if (!product.sku || !product.format || ![product.price, product.cost, product.stock, product.min].every((n) => Number.isSafeInteger(n) && n >= 0) || product.price < 1) { setFormError('Completa SKU y formato. Los montos y cantidades deben ser enteros no negativos; el precio debe ser mayor que cero.'); return; }
      if (state.products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase() && p.id !== product.id)) { setFormError('Ya existe un producto con ese SKU.'); return; }
      save({ ...state, products: existing ? state.products.map((p) => p.id === existing.id ? product : p) : [...state.products, product] }, 'Producto guardado en la demo.');
    } else {
      const key = modal.type === 'customer' ? 'customers' : 'suppliers';
      const record = { ...fields, name, email: fields.email.trim(), phone: fields.phone.trim(), id: existing?.id || id(), ...(key === 'suppliers' ? { status: 'Activo' } : {}) };
      save({ ...state, [key]: existing ? state[key].map((r) => r.id === existing.id ? record : r) : [...state[key], record] }, 'Registro guardado en la demo.');
    }
  }

  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);
    if (modal.type === 'sale') return <SaleForm state={state} onClose={close} onComplete={(next) => save(next, 'Venta demo registrada. El inventario se actualizó.')} />;
    if (modal.type === 'detail') {
      const sale = modal.data;
      return <Dialog title={`Venta #${sale.number}`} onClose={close}><div className="detail-meta"><Badge>Completada · demo</Badge><p>{dateTime(sale.date)}</p><p>{sale.customerName} · {sale.payment}</p></div><div className="receipt">{sale.items.map((item) => <div key={item.productId}><span>{item.quantity} × {item.name}<small>{money(item.price)} c/u</small></span><strong>{money(item.quantity * item.price)}</strong></div>)}<div className="receipt-total"><span>Total con IVA</span><strong>{money(sale.total)}</strong></div></div><p className="form-note">Este detalle es una simulación, no una boleta ni un comprobante de pago.</p></Dialog>;
    }
    if (modal.type === 'stock') return <Dialog title="Movimiento de inventario" onClose={close}><form className="form-stack" onSubmit={(event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      try { save(adjustStock(state, fields.product, Number(fields.quantity), fields.reason), 'Movimiento registrado en la demo.'); } catch (e) { setFormError(e.message); }
    }}><label>Producto<select name="product" defaultValue={modal.data?.id || state.products[0]?.id}>{state.products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.format} ({p.stock} un.)</option>)}</select></label><label>Cantidad a sumar o restar<input autoFocus type="number" name="quantity" required step="1" placeholder="Ej.: 10 para entrada, -2 para merma" /></label><label>Motivo<input name="reason" required maxLength={180} placeholder="Compra demo, ajuste o merma..." /></label><p className="form-note">Las salidas no pueden dejar un stock negativo.</p>{formError && <p className="error" role="alert">{formError}</p>}<button className="btn primary">Guardar movimiento</button></form></Dialog>;
    if (['product', 'customer', 'supplier'].includes(modal.type)) {
      const product = modal.type === 'product';
      const customer = modal.type === 'customer';
      const record = modal.data || {};
      return <Dialog title={`${modal.data ? 'Editar' : 'Nuevo'} ${product ? 'producto' : customer ? 'cliente' : 'proveedor'}`} onClose={close}><form className="form-stack" onSubmit={submitRecord}>
        <label>Nombre<input autoFocus name="name" required maxLength={100} defaultValue={record.name} /></label>
        {product ? <><div className="form-row"><label>SKU<input name="sku" required maxLength={40} defaultValue={record.sku} /></label><label>Categoría<select name="category" defaultValue={record.category || 'Café de origen'}><option>Café de origen</option><option>Sabores de autor</option><option>Insumos</option><option>Complementos</option></select></label></div><label>Formato<input name="format" required defaultValue={record.format} placeholder="250 g · Grano" maxLength={80} /></label><div className="form-row"><label>Precio de venta (CLP)<input name="price" type="number" min="1" step="1" required defaultValue={record.price} /></label><label>Costo de referencia demo (CLP)<input name="cost" type="number" min="0" step="1" required defaultValue={record.cost ?? 0} /></label></div><div className="form-row">{!modal.data && <label>Stock inicial<input name="stock" type="number" min="0" step="1" required defaultValue={0} /></label>}<label>Stock mínimo<input name="min" type="number" min="0" step="1" required defaultValue={record.min ?? 5} /></label></div>{modal.data && <p className="form-note">Para cambiar existencias utiliza un movimiento de inventario.</p>}</> : <><label>Correo electrónico<input name="email" type="email" maxLength={120} defaultValue={record.email} placeholder="contacto@example.com" /></label><label>Teléfono<input name="phone" type="tel" maxLength={30} defaultValue={record.phone} /></label>{customer ? <label>Tipo de cliente<select name="type" defaultValue={record.type || 'Minorista'}><option>Minorista</option><option>Negocio</option></select></label> : <label>Rubro<input name="category" required maxLength={80} defaultValue={record.category} placeholder="Café, insumos, empaques..." /></label>}<p className="form-note">Usa contactos ficticios. Este prototipo no protege datos personales.</p></>}
        {formError && <p className="error" role="alert">{formError}</p>}<button className="btn primary">Guardar {product ? 'producto' : customer ? 'cliente' : 'proveedor'}</button>
      </form></Dialog>;
    }
    if (modal.type === 'alerts') return <Dialog title="Alertas de inventario" onClose={close}><p className="form-note">Se activa una alerta al alcanzar el stock mínimo.</p>{alerts.length ? alerts.map((p) => <div className="alert-line" key={p.id}><div><strong>{p.name}</strong><small>{p.format} · Mínimo {p.min} un.</small></div><Badge tone={p.stock ? 'gold' : 'red'}>{p.stock} un.</Badge><button className="icon-btn" aria-label={`Reponer ${p.name}`} onClick={() => open('stock', p)}><Plus size={17} /></button></div>) : <Empty title="Todo al día" text="No hay productos con stock bajo." />}</Dialog>;
    if (modal.type === 'cash') return <Dialog title={state.cash.open ? 'Cerrar caja demo' : 'Abrir caja demo'} onClose={close}><form className="form-stack" onSubmit={(event) => {
      event.preventDefault();
      const value = Number(new FormData(event.currentTarget).get('amount'));
      if (!Number.isSafeInteger(value) || value < 0) { setFormError('Ingresa un monto entero no negativo.'); return; }
      const cash = state.cash.open ? { ...state.cash, open: false, counted: value, closedAt: new Date().toISOString() } : { open: true, opening: value, openedAt: new Date().toISOString(), closedAt: null, counted: null };
      save({ ...state, cash }, cash.open ? 'Caja demo abierta.' : 'Caja demo cerrada.');
    }}><p>{state.cash.open ? `Efectivo esperado: ${money(cashExpected(state))}. Ingresa el efectivo contado para calcular la diferencia.` : 'Indica el fondo inicial para comenzar una nueva sesión de caja.'}</p><label>{state.cash.open ? 'Efectivo contado (CLP)' : 'Fondo inicial (CLP)'}<input autoFocus type="number" name="amount" min="0" step="1" required /></label>{formError && <p className="error" role="alert">{formError}</p>}<p className="form-note">Solo simulación. El cierre anterior se reemplaza al abrir una nueva sesión.</p><button className="btn primary">Confirmar {state.cash.open ? 'cierre' : 'apertura'}</button></form></Dialog>;
    if (modal.type === 'reset') return <Dialog title="Restablecer demostración" onClose={close}><p>Se eliminarán las ventas, contactos y cambios de inventario de esta demo en este navegador. No afecta al sitio de Café Alegra.</p><div className="dialog-actions"><button className="btn secondary" onClick={close}>Cancelar</button><button className="btn danger" onClick={() => { save(seed(), 'Datos de demostración restablecidos.'); go('dashboard'); }}>Restablecer datos demo</button></div></Dialog>;
    return <Dialog title="Un espacio para gestionar tu café" onClose={close}><div className="about-icon"><Coffee size={34} /></div><p>Prototipo visual independiente inspirado en la identidad de Café Alegra: espresso, crema, oro y un trato cercano.</p><div className="notice"><strong>Sin backend ni autenticación.</strong> Los datos se guardan en este navegador. No hay sincronización entre equipos, cobros reales, emisión fiscal ni integración con WooCommerce, Transbank o Blue Express.</div><p>Precios de referencia tomados de la propuesta; existencias, costos, ventas y contactos son ficticios. Los gráficos describen únicamente la simulación.</p><button className="btn secondary full" onClick={() => open('reset')}><Settings2 size={16} />Restablecer datos de demostración</button></Dialog>;
  };

  return <div className="app-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    {mobileMenu && <button className="menu-overlay" onClick={() => setMobileMenu(false)} aria-label="Cerrar navegación" />}
    <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
      <a className="brand" href="#inicio" onClick={(e) => { e.preventDefault(); go('dashboard'); }}><div className="brand-mark"><Sprout size={28} /></div><span>CAFÉ ALEGRA<small>ADMINISTRACIÓN</small></span></a>
      <div className="workspace"><span className="workspace-icon"><Coffee size={18} /></span><div><strong>Mi local</strong><small>Rancagua · Chile</small></div><span className="live-dot" /></div>
      <div className="nav-caption">PRINCIPAL</div>
      <nav aria-label="Navegación principal">{navigation.map(([key, label, Icon]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => go(key)} aria-current={page === key ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{key === 'inventory' && alerts.length > 0 && <span className="nav-count">{alerts.length}</span>}{page === key && <span className="active-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-card"><Leaf size={22} /><strong>El buen café empieza<br />con una buena gestión.</strong><p>Cada detalle cuenta.</p><div className="sidebar-line" /></div><button className="nav-item" onClick={() => open('about')}><CircleHelp size={18} />Acerca del prototipo</button><div className="profile"><span className="avatar">A</span><div><strong>Modo demostración</strong><small>Sin inicio de sesión</small></div><span className="profile-dot" /></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-btn mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir navegación" aria-expanded={mobileMenu}><Menu size={22} /></button><span>Administración</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-actions"><span className="demo-pill"><span />Demo interactiva</span><button className="notification-btn icon-btn" aria-label={`Ver ${alerts.length} alertas de stock`} onClick={() => open('alerts')}><Bell size={19} />{alerts.length > 0 && <i />}</button><span className="top-divider" /><span className="avatar small-avatar">A</span></div></header>
      <main id="main">
        <div className="page-heading"><div><p className="eyebrow">{page === 'dashboard' ? 'TODO EN SU PUNTO' : 'TU LOCAL, EN ORDEN'}</p><h1>{page === 'dashboard' ? 'Una buena gestión, cada día.' : title}</h1><p className="subtitle">{{ dashboard: 'Así se mueve tu negocio. Un vistazo a lo que importa.', inventory: 'Cada origen, cada bolsa. Tu stock bajo control.', sales: 'El detalle de cada venta, en un solo lugar.', customers: 'Conoce a quienes vuelven por un buen café.', suppliers: 'Los aliados detrás de cada preparación.', cash: 'Entradas claras, cierres tranquilos.', reports: 'Convierte los números en buenas decisiones.' }[page]}</p></div><div className="heading-actions">{['inventory', 'customers', 'sales', 'reports'].includes(page) && <button className="btn secondary export-btn" onClick={exportRows}><Download size={16} />Exportar</button>}<button className="btn primary" onClick={() => open(page === 'inventory' ? 'product' : page === 'customers' ? 'customer' : page === 'suppliers' ? 'supplier' : 'sale')}><Plus size={17} />{page === 'inventory' ? 'Nuevo producto' : page === 'customers' ? 'Nuevo cliente' : page === 'suppliers' ? 'Nuevo proveedor' : 'Nueva venta'}</button></div></div>
        {storageError && <div className="notice error" role="alert">No fue posible guardar los cambios en este navegador. Se perderán al recargar.</div>}
        {page === 'dashboard' && <>
          <section className="welcome-banner"><div><span className="eyebrow">HECHO CON DEDICACIÓN</span><h2>Tu café tiene historia.<br /><em>Tu negocio, un buen rumbo.</em></h2><p>Todo lo que necesitas para cuidar de tu local.</p><button className="banner-link" onClick={() => go('reports')}>Ver el rendimiento del negocio <ArrowRight size={16} /></button></div><div className="banner-art" aria-hidden="true"><span className="art-ring ring-one" /><span className="art-ring ring-two" /><div className="coffee-cup"><div className="coffee-surface"><Leaf size={50} /></div></div><div className="bean bean-one" /><div className="bean bean-two" /><span className="art-caption">ORIGEN · TRADICIÓN · ALEGRA</span></div><span className="banner-date">{new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></section>
          <section className="metrics"><Metric label="Ventas de hoy" value={money(totalOf(todaySales))} note={`${todaySales.length} ventas de demostración`} icon={ShoppingBag} /><Metric label="Ticket promedio de hoy" value={money(todaySales.length ? totalOf(todaySales) / todaySales.length : 0)} note="Por venta completada" icon={CreditCard} tone="green" /><Metric label="Productos en stock" value={state.products.reduce((sum, p) => sum + p.stock, 0)} note={`${state.products.length} referencias en el catálogo`} icon={Package} tone="brown" /><Metric label="Clientes registrados" value={state.customers.length} note="Contactos de demostración" icon={Users} tone="purple" /></section>
          <div className="dashboard-grid"><section className="panel revenue-panel"><div className="panel-heading"><div><h2>El ritmo de tus ventas</h2><p>Ingresos de demostración · CLP</p></div><button className="subtle-select" onClick={() => go('reports')}>Últimos 7 días <ChevronDown size={14} /></button></div><div className="chart-summary"><strong>{money(totalOf(periodSales(state.sales, 7)))}</strong><span><span className="legend-dot" />Ventas completadas</span></div><RevenueChart sales={state.sales} /></section>
            <section className="panel stock-panel"><div className="panel-heading"><div><h2>Un ojo en tu stock</h2><p>Productos que necesitan atención</p></div><span className="alert-count">{alerts.length}</span></div><div className="stock-alerts">{alerts.length ? alerts.slice(0, 3).map((product) => <div className="stock-alert" key={product.id}><div className={`product-thumb ${product.tone}`}><Bag tone={product.tone} small /></div><div className="stock-info"><strong>{product.name}</strong><small>{product.format}</small><div className="stock-meter"><span style={{ width: `${Math.min(100, product.stock / Math.max(1, product.min * 2) * 100)}%` }} /></div></div><span className={`stock-quantity ${!product.stock ? 'out' : ''}`}>{product.stock}<small>unidades</small></span></div>) : <Empty title="Stock al día" text="No hay alertas por ahora." />}</div><button className="panel-link" onClick={() => { go('inventory'); setFilter('Stock bajo'); }}>Revisar inventario <ArrowRight size={16} /></button></section>
          </div>
          <section className="panel"><div className="panel-heading"><div><h2>Las últimas ventas</h2><p>Pequeños momentos, grandes resultados.</p></div><button className="text-button" onClick={() => go('sales')}>Ver todas <ArrowRight size={15} /></button></div><SalesTable sales={state.sales.slice(0, 5)} onSelect={(sale) => open('detail', sale)} /></section>
          <div className="bottom-note"><Sprout size={16} /><span>Gestión con calma. Café con alma.</span><small>Datos ficticios · Almacenamiento local</small></div>
        </>}
        {page === 'inventory' && <>
          <section className="mini-metrics"><div><span>Referencias</span><strong>{state.products.length}</strong></div><div><span>Unidades disponibles</span><strong>{state.products.reduce((sum, p) => sum + p.stock, 0)}</strong></div><div><span>Stock bajo / agotado</span><strong className="text-gold">{alerts.length}</strong></div><div><span>Valor a costo demo</span><strong>{money(state.products.reduce((sum, p) => sum + p.stock * p.cost, 0))}</strong></div></section>
          <section className="panel"><div className="toolbar">{searchField('Buscar producto, formato o SKU...')}<div className="toolbar-actions"><label className="filter-select"><SlidersHorizontal size={15} /><span className="sr-only">Filtrar inventario</span><select value={filter} onChange={(e) => setFilter(e.target.value)}>{['Todos', 'Stock bajo', ...new Set(state.products.map((p) => p.category))].map((value) => <option key={value}>{value}</option>)}</select></label><button className="btn secondary" onClick={() => open('stock')}><ArrowDownLeft size={16} />Movimiento</button></div></div>
            {visibleProducts.length ? <div className="table-scroll"><table><thead><tr><th>Producto</th><th>SKU</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visibleProducts.map((p) => <tr key={p.id}><td><div className="product-cell"><div className={`product-thumb ${p.tone}`}><Bag tone={p.tone} small /></div><div><strong>{p.name}</strong><small>{p.format}</small></div></div></td><td className="muted">{p.sku}</td><td className="amount">{money(p.price)}</td><td><strong>{p.stock}</strong><span className="muted"> / mín. {p.min}</span></td><td><Badge tone={!p.stock ? 'red' : lowStock(p) ? 'gold' : 'green'}>{!p.stock ? 'Agotado' : lowStock(p) ? 'Stock bajo' : 'Disponible'}</Badge></td><td><div className="row-actions"><button className="text-button" onClick={() => open('product', p)}>Editar</button><button className="icon-btn" onClick={() => open('stock', p)} aria-label={`Ajustar stock de ${p.name}`}><Plus size={17} /></button></div></td></tr>)}</tbody></table></div> : <Empty />}
            <div className="table-footer">{visibleProducts.length} de {state.products.length} productos <span>Existencias y costos ficticios</span></div>
          </section>
          <section className="panel movements"><div className="panel-heading"><div><h2>Movimientos de inventario</h2><p>Entradas, ajustes y mermas manuales. Las ventas se consultan en Ventas.</p></div><ArrowDownToLine size={20} /></div>{state.movements.length ? <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Movimiento</th><th>Motivo</th><th>Fecha</th></tr></thead><tbody>{state.movements.slice(0, 20).map((m) => <tr key={m.id}><td>{m.name}</td><td><Badge tone={m.quantity > 0 ? 'green' : 'gold'}>{m.quantity > 0 ? '+' : ''}{m.quantity} un.</Badge></td><td>{m.reason}</td><td className="muted">{dateTime(m.date)}</td></tr>)}</tbody></table></div> : <div className="inline-empty">Sin movimientos manuales. Registra una entrada o un ajuste para comenzar.</div>}</section>
        </>}
        {page === 'sales' && <>
          <section className="metrics three"><Metric label="Ventas del período" value={money(totalOf(periodSales(state.sales, days)))} note={`Últimos ${days} día(s) · Todos los medios`} icon={ShoppingBag} /><Metric label="Operaciones" value={periodSales(state.sales, days).length} note="Ventas completadas de demostración" icon={ShoppingCart} tone="green" /><Metric label="Estado de caja" value={state.cash.open ? 'Abierta' : 'Cerrada'} note="Las nuevas ventas requieren caja abierta" icon={Wallet} tone="brown" /></section>
          <section className="panel"><div className="toolbar">{searchField('Buscar venta, cliente o medio...')}<div className="toolbar-actions">{periodSelect}<label className="filter-select"><span className="sr-only">Medio de pago</span><select value={filter} onChange={(e) => setFilter(e.target.value)}>{['Todos', 'Efectivo', 'Tarjeta', 'Transferencia'].map((value) => <option key={value}>{value}</option>)}</select></label></div></div><SalesTable sales={filteredSales} onSelect={(sale) => open('detail', sale)} /><div className="table-footer">{filteredSales.length} ventas encontradas<span>Total filtrado: {money(totalOf(filteredSales))}</span></div></section>
        </>}
        {['customers', 'suppliers'].includes(page) && <section className="panel"><div className="toolbar">{searchField(page === 'customers' ? 'Buscar cliente o correo...' : 'Buscar proveedor o correo...')}<span className="muted">{state[page].length} registros demo</span></div>{state[page].filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase())).length ? <div className="table-scroll"><table><thead><tr><th>{page === 'customers' ? 'Cliente' : 'Proveedor'}</th><th>Contacto</th><th>{page === 'customers' ? 'Tipo' : 'Rubro'}</th><th>{page === 'customers' ? 'Compras demo' : 'Estado'}</th><th>Acciones</th></tr></thead><tbody>{state[page].filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase())).map((record, index) => <tr key={record.id}><td><div className="person-cell"><span className={`contact-avatar color-${index % 3}`}>{record.name.charAt(0).toUpperCase()}</span><strong>{record.name}</strong></div></td><td><div className="contact-details"><span>{record.email || 'Sin correo'}</span><small>{record.phone || 'Sin teléfono'}</small></div></td><td>{record.type || record.category}</td><td>{page === 'customers' ? <div className="contact-details"><strong>{money(totalOf(state.sales.filter((s) => s.customerId === record.id)))}</strong><small>{state.sales.filter((s) => s.customerId === record.id).length} ventas</small></div> : <Badge>Activo</Badge>}</td><td><button className="text-button" onClick={() => open(page === 'customers' ? 'customer' : 'supplier', record)}>Editar</button></td></tr>)}</tbody></table></div> : <Empty />}<div className="table-footer">Directorio de demostración<span>No ingresar datos personales reales</span></div></section>}
        {page === 'cash' && <>
          <div className="cash-banner"><div><Badge tone={state.cash.open ? 'green' : 'gold'}>Caja {state.cash.open ? 'abierta' : 'cerrada'}</Badge><h2>{state.cash.open ? 'Todo listo para una buena jornada.' : 'Una jornada cerrada, todo en orden.'}</h2><p>Sesión iniciada el {dateTime(state.cash.openedAt)} · Solo simulación local.</p></div><button className="btn primary" onClick={() => open('cash')}><Wallet size={17} />{state.cash.open ? 'Cerrar caja' : 'Abrir caja'}</button></div>
          <section className="metrics three"><Metric label="Fondo inicial" value={money(state.cash.opening)} note="Efectivo de apertura demo" icon={Wallet} /><Metric label="Ingresos en efectivo" value={money(cashExpected(state) - state.cash.opening)} note="Ventas en efectivo de esta sesión" icon={ArrowDownLeft} tone="green" /><Metric label="Efectivo esperado" value={money(cashExpected(state))} note="Fondo inicial + ventas en efectivo" icon={CreditCard} tone="brown" /></section>
          {!state.cash.open && <section className="closing-summary panel"><h2>Resumen del último cierre</h2><div><span>Contado <strong>{money(state.cash.counted)}</strong></span><span>Diferencia <strong className={state.cash.counted === cashExpected(state) ? 'text-green' : 'text-red'}>{money(state.cash.counted - cashExpected(state))}</strong></span><span>Cierre <strong>{dateTime(state.cash.closedAt)}</strong></span></div><p className="form-note">Una diferencia negativa indica faltante; una positiva, sobrante. Al abrir nuevamente se reemplaza este cierre.</p></section>}
          <section className="panel"><div className="panel-heading"><div><h2>Ventas de esta sesión</h2><p>Todos los medios de pago. Solo efectivo afecta el saldo de caja.</p></div></div><SalesTable sales={state.sales.filter((s) => s.date >= state.cash.openedAt && (!state.cash.closedAt || s.date <= state.cash.closedAt))} onSelect={(sale) => open('detail', sale)} /></section>
        </>}
        {page === 'reports' && <>
          <div className="report-toolbar"><span className="muted">Solo datos de demostración · Precios finales con IVA</span>{periodSelect}</div>
          <section className="metrics three"><Metric label="Ingresos del período" value={money(totalOf(periodSales(state.sales, days)))} note={`${periodSales(state.sales, days).length} ventas completadas`} icon={BarChart3} /><Metric label="Margen bruto estimado demo" value={money(periodSales(state.sales, days).reduce((sum, s) => sum + s.items.reduce((subtotal, item) => subtotal + (item.price - item.cost) * item.quantity, 0), 0))} note="Venta menos costo ficticio; no es utilidad neta" icon={ArrowUpRight} tone="green" /><Metric label="Ticket promedio" value={money(periodSales(state.sales, days).length ? totalOf(periodSales(state.sales, days)) / periodSales(state.sales, days).length : 0)} note="Promedio por operación del período" icon={CreditCard} tone="purple" /></section>
          <section className="panel"><div className="panel-heading"><div><h2>Evolución de ventas</h2><p>Ingresos diarios en pesos chilenos</p></div><span className="chart-legend"><span className="legend-dot" />Ventas demo</span></div><RevenueChart sales={state.sales} days={days} /></section>
          <div className="dashboard-grid report-bottom"><section className="panel"><div className="panel-heading"><div><h2>Los favoritos del período</h2><p>Ranking por unidades vendidas</p></div></div>{(() => {
            const ranking = new Map();
            periodSales(state.sales, days).forEach((sale) => sale.items.forEach((item) => {
              const prior = ranking.get(item.productId) || { name: item.name, units: 0, revenue: 0 };
              ranking.set(item.productId, { ...prior, units: prior.units + item.quantity, revenue: prior.revenue + item.price * item.quantity });
            }));
            return ranking.size ? [...ranking].sort((a, b) => b[1].units - a[1].units).slice(0, 5).map(([key, p], index) => <div className="ranking-line" key={key}><span className="ranking-number">0{index + 1}</span><div><strong>{p.name}</strong><small>{p.units} unidades vendidas</small></div><strong>{money(p.revenue)}</strong></div>) : <Empty title="Sin ventas en este período" />;
          })()}</section><section className="panel"><div className="panel-heading"><div><h2>Medios de pago</h2><p>Distribución de ingresos del período</p></div></div><div className="payment-breakdown">{['Tarjeta', 'Efectivo', 'Transferencia'].map((payment, index) => {
            const total = totalOf(periodSales(state.sales, days).filter((s) => s.payment === payment));
            const percent = totalOf(periodSales(state.sales, days)) ? total / totalOf(periodSales(state.sales, days)) * 100 : 0;
            return <div className={`payment-breakdown-row payment-${index}`} key={payment}><div><span>{payment}</span><strong>{money(total)}</strong></div><div className="payment-track"><span style={{ width: `${percent}%` }} /></div><small>{percent.toFixed(1)}% del total</small></div>;
          })}</div></section></div><div className="notice">El margen usa costos ficticios guardados al registrar cada venta. No descuenta IVA, gastos operativos ni impuestos y no es un reporte contable.</div>
        </>}
      </main><footer className="footer"><span>ALEGRA <i>·</i> Sistema de gestión</span><span>Prototipo visual · Sin backend <button onClick={() => open('about')}>Más información <ArrowRight size={12} /></button></span></footer>
    </div>{renderModal()}{toast && <div className="toast" role="status"><Check size={18} />{toast}<button className="icon-btn" onClick={() => setToast('')} aria-label="Cerrar aviso"><X size={15} /></button></div>}
  </div>;
}
