import { test, expect } from '@playwright/test';

test('vende, descuenta inventario y conserva los datos al recargar', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Una buena gestión, cada día.' })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva venta', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Origen Guatemala/ }).click();
  await dialog.getByRole('button', { name: 'Sumar Origen Guatemala', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption('c1');
  await dialog.getByLabel('Medio de pago').selectOption('Efectivo');
  await expect(dialog.getByText('$29.000', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Registrar venta demo' }).click();
  await expect(page.getByRole('status')).toContainText('Venta demo registrada');
  await page.getByRole('button', { name: 'Inventario', exact: false }).first().click();
  const row = page.getByRole('row').filter({ hasText: 'ALG-GUA-250' });
  await expect(row.getByRole('cell').nth(3)).toContainText('22');
  await page.reload();
  await page.getByRole('button', { name: 'Inventario', exact: false }).first().click();
  await expect(page.getByRole('row').filter({ hasText: 'ALG-GUA-250' }).getByRole('cell').nth(3)).toContainText('22');
  await page.getByRole('button', { name: 'Ventas', exact: true }).click();
  await page.getByRole('button', { name: '#1029', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Cliente de ejemplo A');
  await expect(page.getByRole('dialog')).toContainText('$29.000');
  expect(errors).toEqual([]);
});

test('ajusta stock, rechaza una salida inválida y filtra existencias', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Inventario', exact: false }).first().click();
  await page.getByRole('button', { name: 'Ajustar stock de Praliné Pistacho' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Cantidad a sumar o restar').fill('-1');
  await dialog.getByLabel('Motivo').fill('Merma de prueba');
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
  await expect(dialog.getByRole('alert')).toContainText('stock negativo');
  await dialog.getByLabel('Cantidad a sumar o restar').fill('12');
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'ALG-PIS-100' })).toContainText('Disponible');
  await page.getByLabel('Filtrar inventario').selectOption('Stock bajo');
  await expect(page.getByRole('row').filter({ hasText: 'ALG-PIS-100' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'ALG-BOL-250' })).toBeVisible();
});

test('crea y edita contactos, agrega un producto y exporta el filtro', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre', { exact: true }).fill('Contacto de prueba');
  await page.getByRole('dialog').getByLabel('Correo electrónico').fill('prueba@example.com');
  await page.getByRole('button', { name: 'Guardar cliente' }).click();
  const customer = page.getByRole('row').filter({ hasText: 'Contacto de prueba' });
  await expect(customer).toContainText('prueba@example.com');
  await customer.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('dialog').getByLabel('Tipo de cliente').selectOption('Negocio');
  await page.getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(customer).toContainText('Negocio');
  await page.getByRole('button', { name: 'Proveedores', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
  await page.getByRole('dialog').getByLabel('Nombre', { exact: true }).fill('Proveedor de prueba');
  await page.getByRole('dialog').getByLabel('Rubro').fill('Insumos');
  await page.getByRole('button', { name: 'Guardar proveedor' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Proveedor de prueba' })).toBeVisible();
  await page.getByRole('button', { name: 'Inventario', exact: false }).first().click();
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Filtros de prueba');
  await dialog.getByLabel('SKU', { exact: true }).fill('TEST-001');
  await dialog.getByLabel('Formato').fill('Caja 100 un.');
  await dialog.getByLabel('Precio de venta (CLP)').fill('5000');
  await dialog.getByLabel('Stock inicial').fill('10');
  await dialog.getByRole('button', { name: 'Guardar producto' }).click();
  await page.getByLabel('Buscar producto, formato o SKU...').fill('TEST-001');
  await expect(page.getByRole('row').filter({ hasText: 'TEST-001' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/alegra-demo-inventory.*\.csv/);
});

test('cierra la caja, bloquea ventas y abre otra sesión', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Caja', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Efectivo contado (CLP)').fill('49000');
  await page.getByRole('button', { name: 'Confirmar cierre' }).click();
  await expect(page.getByText('Caja cerrada', { exact: true })).toBeVisible();
  await expect(page.locator('.closing-summary .text-red')).toHaveText(/\$-1\.000|-\$1\.000/);
  await page.getByRole('button', { name: 'Nueva venta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Registrar venta demo' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Fondo inicial (CLP)').fill('30000');
  await page.getByRole('button', { name: 'Confirmar apertura' }).click();
  await expect(page.getByText('Caja abierta', { exact: true })).toBeVisible();
});

test('reportes cambian de período y el restablecimiento borra cambios locales', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Reportes', exact: true }).click();
  await page.getByLabel('Período').selectOption('30');
  await expect(page.getByRole('img', { name: /Ventas de los últimos 30 días/ })).toBeVisible();
  await page.getByRole('button', { name: 'Acerca del prototipo' }).click();
  await expect(page.getByRole('dialog')).toContainText('Sin backend ni autenticación');
  await page.getByRole('button', { name: 'Restablecer datos de demostración' }).click();
  await page.getByRole('button', { name: 'Restablecer datos demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Una buena gestión, cada día.' })).toBeVisible();
});

test('el menú móvil navega sin desbordamiento de página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Una buena gestión, cada día.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await page.getByRole('button', { name: 'Inventario', exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('textos legibles y sin desbordamiento en escritorio, tablet y móvil', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ['.nav-item', '.subtitle', '.btn', 'table', '.sale-number', '.stock-info strong']) {
      const size = await page.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(size, `${selector} a ${width}px`).toBeGreaterThanOrEqual(14);
    }
    const contrast = await page.locator('.subtitle').evaluate((element) => {
      const luminance = (color) => {
        const values = color.match(/\d+/g).slice(0, 3).map((channel) => {
          const value = Number(channel) / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      const foreground = luminance(getComputedStyle(element).color);
      const background = luminance(getComputedStyle(document.documentElement).backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    const labelsDoNotOverlap = await page.locator('.chart-column > small').evaluateAll((elements) => {
      const bounds = elements.map((element) => element.getBoundingClientRect());
      return bounds.every((rect, index) => !index || bounds[index - 1].right <= rect.left);
    });
    expect(labelsDoNotOverlap).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`legibilidad-${width}.png`), fullPage: true });
  }
});
