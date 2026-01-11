import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization
let db;

const INITIAL_INVENTORY = [
  { id: 'd1', name: 'Аспирин 500мг', stock: 100, requiresPrescription: 0 },
  { id: 'd2', name: 'Амоксициллин 250мг', stock: 20, requiresPrescription: 1 },
  { id: 'd3', name: 'Ибупрофен 400мг', stock: 50, requiresPrescription: 0 },
  { id: 'd4', name: 'Аторвастатин 10мг', stock: 15, requiresPrescription: 1 },
  { id: 'd5', name: 'Метформин 500мг', stock: 30, requiresPrescription: 1 },
  { id: 'd6', name: 'Витамин С 1000мг', stock: 200, requiresPrescription: 0 },
  { id: 'd7', name: 'Лизиноприл 10мг', stock: 10, requiresPrescription: 1 },
  { id: 'd8', name: 'Парацетамол 500мг', stock: 150, requiresPrescription: 0 },
  { id: 'd9', name: 'Кларитромицин 500мг', stock: 25, requiresPrescription: 1 },
  { id: 'd10', name: 'Азитромицин 500мг', stock: 40, requiresPrescription: 1 },
  { id: 'd11', name: 'Цитрамон П', stock: 200, requiresPrescription: 0 },
  { id: 'd12', name: 'Активированный уголь', stock: 300, requiresPrescription: 0 },
  { id: 'd13', name: 'Бисопролол 5мг', stock: 60, requiresPrescription: 1 },
  { id: 'd14', name: 'Нимесил 100мг', stock: 80, requiresPrescription: 1 },
  { id: 'd15', name: 'Панкреатин 25ЕД', stock: 120, requiresPrescription: 0 },
  { id: 'd16', name: 'Левотироксин 50мкг', stock: 45, requiresPrescription: 1 },
  { id: 'd17', name: 'Омепразол 20мг', stock: 90, requiresPrescription: 0 },
  { id: 'd18', name: 'Флуконазол 150мг', stock: 35, requiresPrescription: 1 },
];

async function initializeDB() {
  db = await open({
    filename: path.join(__dirname, 'pharmacy.db'),
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS drugs (
      id TEXT PRIMARY KEY,
      name TEXT,
      stock INTEGER,
      requiresPrescription INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customerName TEXT,
      orderDate TEXT,
      prescriptionForDrugIds TEXT -- JSON string of IDs
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      drugId TEXT,
      quantity INTEGER,
      FOREIGN KEY(orderId) REFERENCES orders(id),
      FOREIGN KEY(drugId) REFERENCES drugs(id)
    );
  `);

  // Seed data if empty
  const count = await db.get('SELECT count(*) as count FROM drugs');
  if (count.count === 0) {
    console.log('Seeding database...');
    for (const drug of INITIAL_INVENTORY) {
      await db.run(
        'INSERT INTO drugs (id, name, stock, requiresPrescription) VALUES (?, ?, ?, ?)',
        [drug.id, drug.name, drug.stock, drug.requiresPrescription]
      );
    }
  }
}

// --- REST API Routes ---

// 1. Get Inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const drugs = await db.all('SELECT * FROM drugs');
    const formatted = drugs.map(d => ({ ...d, requiresPrescription: !!d.requiresPrescription }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Get Orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders');
    const result = [];

    for (const order of orders) {
      const items = await db.all('SELECT * FROM order_items WHERE orderId = ?', order.id);
      result.push({
        ...order,
        prescriptionForDrugIds: JSON.parse(order.prescriptionForDrugIds || '[]'),
        items
      });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Create Order
app.post('/api/orders', async (req, res) => {
  const { id, customerName, orderDate, prescriptionForDrugIds } = req.body;
  try {
    await db.run(
      'INSERT INTO orders (id, customerName, orderDate, prescriptionForDrugIds) VALUES (?, ?, ?, ?)',
      [id, customerName, orderDate, JSON.stringify(prescriptionForDrugIds)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Delete Order
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const items = await db.all('SELECT * FROM order_items WHERE orderId = ?', id);
    for (const item of items) {
      await db.run('UPDATE drugs SET stock = stock + ? WHERE id = ?', [item.quantity, item.drugId]);
    }
    await db.run('DELETE FROM order_items WHERE orderId = ?', id);
    await db.run('DELETE FROM orders WHERE id = ?', id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Add Item
app.post('/api/orders/:orderId/items', async (req, res) => {
  const { orderId } = req.params;
  const { drugId, quantity } = req.body;
  try {
    const drug = await db.get('SELECT * FROM drugs WHERE id = ?', drugId);
    const order = await db.get('SELECT * FROM orders WHERE id = ?', orderId);
    if (!drug || !order) return res.status(404).json({ error: 'Not found' });
    if (quantity > drug.stock) return res.status(400).json({ error: `Недостаточно товара.` });

    const prescriptionIds = JSON.parse(order.prescriptionForDrugIds || '[]');
    if (drug.requiresPrescription && !prescriptionIds.includes(drug.id)) {
      return res.status(400).json({ error: `Требуется рецепт.` });
    }

    await db.run('UPDATE drugs SET stock = stock - ? WHERE id = ?', [quantity, drugId]);
    const existingItem = await db.get('SELECT * FROM order_items WHERE orderId = ? AND drugId = ?', [orderId, drugId]);
    if (existingItem) {
      await db.run('UPDATE order_items SET quantity = quantity + ? WHERE id = ?', [quantity, existingItem.id]);
    } else {
      const newItemId = Math.random().toString(36).substr(2, 9);
      await db.run('INSERT INTO order_items (id, orderId, drugId, quantity) VALUES (?, ?, ?, ?)', [newItemId, orderId, drugId, quantity]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5.5 Update Quantity
app.patch('/api/orders/:orderId/items/:itemId', async (req, res) => {
  const { orderId, itemId } = req.params;
  const { delta } = req.body;
  try {
    const item = await db.get('SELECT * FROM order_items WHERE id = ? AND orderId = ?', [itemId, orderId]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const drug = await db.get('SELECT * FROM drugs WHERE id = ?', item.drugId);
    if (delta > 0) {
      if (drug.stock < delta) return res.status(400).json({ error: `Недостаточно товара.` });
      await db.run('UPDATE drugs SET stock = stock - ? WHERE id = ?', [delta, drug.id]);
      await db.run('UPDATE order_items SET quantity = quantity + ? WHERE id = ?', [delta, itemId]);
    } else {
      await db.run('UPDATE drugs SET stock = stock + ? WHERE id = ?', [Math.abs(delta), drug.id]);
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) await db.run('DELETE FROM order_items WHERE id = ?', itemId);
      else await db.run('UPDATE order_items SET quantity = quantity + ? WHERE id = ?', [delta, itemId]);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Remove Item
app.delete('/api/orders/:orderId/items/:itemId', async (req, res) => {
  const { orderId, itemId } = req.params;
  try {
    const item = await db.get('SELECT * FROM order_items WHERE id = ? AND orderId = ?', [itemId, orderId]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await db.run('UPDATE drugs SET stock = stock + ? WHERE id = ?', [item.quantity, item.drugId]);
    await db.run('DELETE FROM order_items WHERE id = ?', itemId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Move Item
app.post('/api/move-item', async (req, res) => {
  const { itemId, sourceOrderId, targetOrderId } = req.body;
  try {
    const item = await db.get('SELECT * FROM order_items WHERE id = ? AND orderId = ?', [itemId, sourceOrderId]);
    const drug = await db.get('SELECT * FROM drugs WHERE id = ?', item.drugId);
    const targetOrder = await db.get('SELECT * FROM orders WHERE id = ?', targetOrderId);
    const targetRxIds = JSON.parse(targetOrder.prescriptionForDrugIds || '[]');
    if (drug.requiresPrescription && !targetRxIds.includes(drug.id)) {
      return res.status(400).json({ error: `Нет рецепта у цели.` });
    }
    const existingTargetItem = await db.get('SELECT * FROM order_items WHERE orderId = ? AND drugId = ?', [targetOrderId, item.drugId]);
    if (existingTargetItem) {
      await db.run('UPDATE order_items SET quantity = quantity + ? WHERE id = ?', [item.quantity, existingTargetItem.id]);
      await db.run('DELETE FROM order_items WHERE id = ?', itemId);
    } else {
      await db.run('UPDATE order_items SET orderId = ? WHERE id = ?', [targetOrderId, itemId]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Simulation: Next Day
app.post('/api/simulation/next-day', async (req, res) => {
  const { currentDateStr } = req.body; // Expecting YYYY-MM-DD
  
  try {
    // 1. Remove past orders
    const orders = await db.all('SELECT * FROM orders');
    for (const order of orders) {
      if (order.orderDate < currentDateStr) {
        await db.run('DELETE FROM order_items WHERE orderId = ?', order.id);
        await db.run('DELETE FROM orders WHERE id = ?', order.id);
      }
    }

    // 2. Random restock
    const drugs = await db.all('SELECT * FROM drugs');
    for (const drug of drugs) {
      const addedStock = Math.floor(Math.random() * 20);
      await db.run('UPDATE drugs SET stock = stock + ? WHERE id = ?', [addedStock, drug.id]);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 9. Debug DB
app.get('/api/debug/db', async (req, res) => {
  try {
    const drugs = await db.all('SELECT * FROM drugs');
    const orders = await db.all('SELECT * FROM orders');
    const orderItems = await db.all('SELECT * FROM order_items');
    const html = `
      <html>
        <head><title>Debug DB</title><style>body { font-family: sans-serif; padding: 20px; } table { border-collapse: collapse; width: 100%; margin-bottom: 20px; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }</style></head>
        <body>
          <h1>База данных</h1>
          <h2>Препараты</h2><table><tr><th>ID</th><th>Название</th><th>Запас</th></tr>${drugs.map(d=>`<tr><td>${d.id}</td><td>${d.name}</td><td>${d.stock}</td></tr>`).join('')}</table>
          <h2>Заказы</h2><table><tr><th>ID</th><th>Клиент</th><th>Дата</th></tr>${orders.map(o=>`<tr><td>${o.id}</td><td>${o.customerName}</td><td>${o.orderDate}</td></tr>`).join('')}</table>
        </body>
      </html>`;
    res.send(html);
  } catch (e) { res.status(500).send(e.message); }
});

initializeDB().then(() => {
  app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
});