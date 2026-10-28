# Alegra · Sistema web de gestión

Prototipo visual interactivo para Café Alegra, inspirado en la paleta espresso, crema y oro de [CafeAlegra-Propuesta](https://github.com/Manuel-GY/CafeAlegra-Propuesta).

**Demo:** https://manuel-gy.github.io/sistema-web-alegra/

## Alcance

- Resumen con indicadores, gráfico de ventas, últimas operaciones y alertas de stock.
- Inventario: crear y editar productos, buscar por SKU, filtrar categorías, entradas, ajustes y mermas con motivo.
- Ventas: selección de productos, cantidades limitadas por stock, cliente, medio de pago, detalle y actualización del inventario.
- Directorios editables de clientes y proveedores.
- Caja: apertura, ventas de la sesión, efectivo esperado, cierre contado y diferencia.
- Reportes por día, siete o treinta días: ingresos, ticket promedio, favoritos y medios de pago.
- Exportación CSV de inventario, clientes y ventas según los filtros de la vista.
- Diseño adaptable, navegación por teclado, ventanas modales y persistencia local.

## Ejecutar

Requiere Node.js 22.12 o superior; se recomienda Node.js 24.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir la dirección indicada por Vite. En macOS/Linux se puede usar `npm` en lugar de `npm.cmd`.

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`npm.cmd run preview` permite revisar la compilación. GitHub Actions ejecuta lint, pruebas unitarias, compilación y pruebas de navegador antes de publicar en Pages. El repositorio debe tener **Settings > Pages > Source: GitHub Actions**.

## Datos y limitaciones

**No es un sistema de producción. No tiene backend, inicio de sesión ni control de permisos.** No cobra dinero, no emite boletas o facturas, no calcula obligaciones tributarias y no integra WooCommerce, Transbank ni Blue Express. El sitio original no se modifica.

Los cambios viven solo en `localStorage` del navegador (clave `alegra-demo-v1`), no se sincronizan y pueden perderse al limpiar el navegador. Si el almacenamiento falla, la interfaz muestra un aviso. No guardar datos personales reales ni información sensible.

Los seis productos iniciales y sus precios de referencia en CLP se basan en la propuesta consultada; los formatos representan solo una selección del catálogo. Existencias, stock mínimo, costos, movimientos, contactos y ventas son ficticios. Los envases son ilustraciones CSS originales, no fotografías oficiales. Las fuentes Google Fonts tienen alternativas locales si no hay conexión.

La demo comienza con 28 ventas ficticias distribuidas en siete días y una caja abierta con fondo de $50.000. Esas ventas son anteriores a la sesión de caja inicial. Solo las nuevas ventas en efectivo aumentan el saldo de esa sesión; las ventas con tarjeta o transferencia no lo afectan.

El margen estimado usa precio menos costo ficticio guardado en cada venta. No descuenta IVA, gastos ni impuestos y no representa utilidad neta. Los indicadores describen datos demo, no el rendimiento real del local.

Para volver al inicio: **Acerca del prototipo > Restablecer datos de demostración**. Abrir una nueva caja reemplaza el resumen del cierre anterior; no hay historial contable de sesiones, compras a proveedores, devoluciones ni pagos reales.

## Estructura

```text
src/App.jsx       Interfaz y navegación
src/model.js      Datos demo, ventas, stock, caja y exportación
src/styles.css    Identidad visual y diseño adaptable
tests/            Pruebas de lógica y flujos de navegador
.github/          Validación y despliegue en GitHub Pages
```
