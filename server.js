require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ------------------------------
// Database initialisation – only after this we start listening
// ------------------------------
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.error('Make sure PostgreSQL is running and database "grand_atrium" exists.');
    process.exit(1);
  }
  console.log('✅ Connected to PostgreSQL');
  release();

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS floors (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS wings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level_id INT REFERENCES floors(id),
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      color_class TEXT
    );
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id INT REFERENCES categories(id),
      level_id INT REFERENCES floors(id),
      wing_id TEXT REFERENCES wings(id),
      emoji TEXT NOT NULL,
      cc TEXT,
      ibg TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS amenities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      wing_id TEXT REFERENCES wings(id),
      level_id INT REFERENCES floors(id),
      description TEXT,
      coordinates JSONB
    );
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      store_id TEXT REFERENCES stores(id),
      wing_id TEXT REFERENCES wings(id),
      image_url TEXT
    );
    CREATE TABLE IF NOT EXISTS opening_hours (
      store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
      day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
      open_time TIME,
      close_time TIME,
      is_closed BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (store_id, day_of_week)
    );
  `);

  // Seed reference data if empty
  const floorCount = await pool.query('SELECT COUNT(*) FROM floors');
  if (parseInt(floorCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO floors (id, name, description) VALUES
      (1, 'Level 1', 'Main shopping concourse'),
      (2, 'Level 2', 'Dining, entertainment & wellness');
    `);
    await pool.query(`
      INSERT INTO wings (id, name, level_id, description) VALUES
      ('north', 'North Wing', 1, 'Fashion & luxury'),
      ('south', 'South Wing', 1, 'Electronics, cinema & food hall'),
      ('east', 'East Wing', 1, 'Books, sports & art'),
      ('west', 'West Wing', 1, 'Kids & quick services'),
      ('center', 'Center Court', 1, 'Main atrium with fountain'),
      ('rooftop', 'Rooftop Terrace', 2, 'Fine dining & views');
    `);
    await pool.query(`
      INSERT INTO categories (name, icon, color_class) VALUES
      ('Apparel', '👗', 'chip-gold'),
      ('Coffee Shop', '☕', 'chip-blue'),
      ('Electronics', '💻', 'chip-blue'),
      ('Home & Decor', '🛋', 'chip-gold'),
      ('Footwear', '👟', 'chip-gold'),
      ('Health & Beauty', '💊', 'chip-green'),
      ('Food Court', '🍜', 'chip-red'),
      ('Sports & Fitness', '🏃', 'chip-blue'),
      ('Books & Stationery', '📚', 'chip-purple'),
      ('Kids & Toys', '🧸', 'chip-red'),
      ('Services', '🛎', 'chip-purple'),
      ('Luxury Boutique', '💎', 'chip-gold'),
      ('Gaming', '🎮', 'chip-blue'),
      ('Fine Dining', '🍽', 'chip-gold'),
      ('Wellness', '🧖', 'chip-purple'),
      ('Entertainment', '🎬', 'chip-red'),
      ('Bar & Lounge', '🍻', 'chip-red'),
      ('Art & Gifts', '🎨', 'chip-purple'),
      ('Jewellery', '💍', 'chip-gold'),
      ('Health & Nutrition', '🥤', 'chip-green');
    `);
  }

  // Seed stores if empty
  const storeCount = await pool.query('SELECT COUNT(*) FROM stores');
  if (parseInt(storeCount.rows[0].count) === 0) {
    const getCat = async (name) => (await pool.query('SELECT id FROM categories WHERE name = $1', [name])).rows[0].id;

    const storesData = [
      ['aura', 'Aura Fashion', 'Apparel', 1, 'north', '👗', 'chip-gold', '#FDF8EE', "Trendy women's wear"],
      ['bloom', 'Bloom & Brew', 'Coffee Shop', 1, 'center', '☕', 'chip-blue', '#EEF4FA', 'Artisan coffee & pastries'],
      ['tech', 'TechPoint', 'Electronics', 1, 'south', '💻', 'chip-blue', '#EEF4FA', 'Latest gadgets and repairs'],
      ['zara', 'Zara Home', 'Home & Decor', 1, 'north', '🛋', 'chip-gold', '#FDF8EE', 'Modern home furnishings'],
      ['sole', 'Sole Society', 'Footwear', 1, 'north', '👟', 'chip-gold', '#FDF8EE', 'Shoes for every occasion'],
      ['grove', 'The Grove Pharmacy', 'Health & Beauty', 1, 'south', '💊', 'chip-green', '#EEF6F0', 'Wellness products'],
      ['bites', 'Quick Bites Food Hall', 'Food Court', 1, 'south', '🍜', 'chip-red', '#F9EEEE', 'Asian & Western street food'],
      ['sports', 'Peak Performance', 'Sports & Fitness', 1, 'east', '🏃', 'chip-blue', '#EEF4FA', 'Activewear & gear'],
      ['reads', 'Chapter One Books', 'Books & Stationery', 1, 'east', '📚', 'chip-purple', '#F4EEF9', 'Bestsellers & gifts'],
      ['kids', 'Little Wonders', 'Kids & Toys', 1, 'west', '🧸', 'chip-red', '#F9EEEE', "Toys & children's clothing"],
      ['atm', 'Grand Atrium Concierge', 'Services', 1, 'center', '🛎', 'chip-purple', '#F4EEF9', 'Information & ticket sales'],
      ['velvet', 'Velvet Threads', 'Luxury Boutique', 2, 'north', '💎', 'chip-gold', '#FDF8EE', 'Designer collections'],
      ['pixel', 'Pixel Games', 'Gaming', 2, 'south', '🎮', 'chip-blue', '#EEF4FA', 'Arcade & esports lounge'],
      ['glass', 'The Glass Onion', 'Fine Dining', 2, 'rooftop', '🍽', 'chip-gold', '#FDF8EE', 'Modern European cuisine'],
      ['aurora', 'Aurora Spa & Beauty', 'Wellness', 2, 'north', '🧖', 'chip-purple', '#F4EEF9', 'Massage & facials'],
      ['cinema', 'Lumière Cinema', 'Entertainment', 2, 'south', '🎬', 'chip-red', '#F9EEEE', '4K digital projection'],
      ['draft', 'Draft & Pour', 'Bar & Lounge', 2, 'east', '🍻', 'chip-red', '#F9EEEE', 'Craft beer & cocktails'],
      ['studio', 'Studio Art & Framing', 'Art & Gifts', 2, 'east', '🎨', 'chip-purple', '#F4EEF9', 'Local art & custom framing'],
      ['jewel', 'Crown & Stone', 'Jewellery', 2, 'north', '💍', 'chip-gold', '#FDF8EE', 'Fine jewellery & watches'],
      ['fit', 'FitFuel Nutrition', 'Health & Nutrition', 2, 'west', '🥤', 'chip-green', '#EEF6F0', 'Smoothies & supplements']
    ];

    for (const s of storesData) {
      const catId = await getCat(s[2]);
      await pool.query(`
        INSERT INTO stores (id, name, category_id, level_id, wing_id, emoji, cc, ibg, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [s[0], s[1], catId, s[3], s[4], s[5], s[6], s[7], s[8]]);
    }
    console.log('✅ Stores seeded');
  }

  // Seed amenities if empty
  const amenityCount = await pool.query('SELECT COUNT(*) FROM amenities');
  if (parseInt(amenityCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO amenities (name, icon, wing_id, level_id, description) VALUES
      ('ATM', '🏧', 'center', 1, 'Next to Concierge'),
      ('Restrooms', '🚻', 'center', 1, 'Near the fountain'),
      ('Restrooms', '🚻', 'north', 2, 'Opposite Aura Fashion'),
      ('Charging Stations', '🔋', 'south', 1, 'Food hall seating area'),
      ('Nursing Room', '🍼', 'west', 1, 'Next to Little Wonders'),
      ('Prayer Room', '🕌', 'east', 2, 'Silent area near Studio Art');
    `);
    console.log('✅ Amenities seeded');
  }

  // Seed events if empty
  const eventCount = await pool.query('SELECT COUNT(*) FROM events');
  if (parseInt(eventCount.rows[0].count) === 0) {
    const now = new Date();
    const nextWeek = new Date(); nextWeek.setDate(now.getDate() + 7);
    await pool.query(`
      INSERT INTO events (title, description, start_date, end_date, store_id, wing_id) VALUES
      ('Live Piano', 'Classical piano at the fountain', $1, $2, NULL, 'center'),
      ('Tech Workshop', 'Learn coding with TechPoint', $1, $2, 'tech', NULL),
      ('Wine Tasting', 'Sample fine wines at The Glass Onion', $1, $2, 'glass', NULL);
    `, [now, nextWeek]);
    console.log('✅ Events seeded');
  }

  console.log('✅ Database fully initialised');

  // ------------------------------
  // API endpoints (same as before)
  // ------------------------------
  app.get('/api/stores', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as category_name, c.icon as category_icon, c.color_class,
               f.name as level_name, w.name as wing_name
        FROM stores s
        JOIN categories c ON s.category_id = c.id
        JOIN floors f ON s.level_id = f.id
        JOIN wings w ON s.wing_id = w.id
        ORDER BY f.id, w.name, s.name
      `);
      res.json(result.rows);
      
    } catch (err) { 
      console.error('❌ /api/stores error:', err); 
      res.status(500).json({ error: err.message }); }
  });

  app.get('/api/stores/:id', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as category_name, c.icon as category_icon, c.color_class,
               f.name as level_name, w.name as wing_name
        FROM stores s
        JOIN categories c ON s.category_id = c.id
        JOIN floors f ON s.level_id = f.id
        JOIN wings w ON s.wing_id = w.id
        WHERE s.id = $1
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/stores', async (req, res) => {
    const { id, name, category_id, level_id, wing_id, emoji, cc, ibg, description } = req.body;
    if (!id || !name || !category_id || !level_id || !wing_id || !emoji) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      await pool.query(`
        INSERT INTO stores (id, name, category_id, level_id, wing_id, emoji, cc, ibg, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, name, category_id, level_id, wing_id, emoji, cc || '', ibg || '#FFFFFF', description || '']);
      res.status(201).json({ id });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/stores/:id', async (req, res) => {
    const { name, category_id, level_id, wing_id, emoji, cc, ibg, description } = req.body;
    try {
      const result = await pool.query(`
        UPDATE stores
        SET name=$1, category_id=$2, level_id=$3, wing_id=$4, emoji=$5, cc=$6, ibg=$7, description=$8
        WHERE id=$9
      `, [name, category_id, level_id, wing_id, emoji, cc, ibg, description, req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Store not found' });
      res.json({ updated: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/stores/:id', async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM stores WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Store not found' });
      res.json({ deleted: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/wings', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT w.*, f.name as level_name
        FROM wings w
        JOIN floors f ON w.level_id = f.id
        ORDER BY f.id, w.name
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/categories', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM categories ORDER BY name');
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/amenities', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT a.*, w.name as wing_name, f.name as level_name
        FROM amenities a
        LEFT JOIN wings w ON a.wing_id = w.id
        LEFT JOIN floors f ON a.level_id = f.id
        ORDER BY f.id, w.name, a.name
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/events', async (req, res) => {
    try {
      const now = new Date();
      const result = await pool.query(`
        SELECT e.*, s.name as store_name, w.name as wing_name
        FROM events e
        LEFT JOIN stores s ON e.store_id = s.id
        LEFT JOIN wings w ON e.wing_id = w.id
        WHERE e.end_date >= $1
        ORDER BY e.start_date
      `, [now]);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ------------------------------
  // START SERVER only after DB is fully ready
  // ------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Grand Atrium Full Backend running at http://localhost:${PORT}`);
    console.log(`📱 Access from other devices: http://<YOUR_IP>:${PORT}`);
    console.log(`🛠️  Admin panel: http://localhost:${PORT}/admin.html\n`);
  });
});
