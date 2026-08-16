import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || '';
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, ssl: databaseUrl.includes('sslmode=require') ? undefined : { rejectUnauthorized: false } })
  : null;

const demoPackages = [
  { id: 1, name: 'Umrah Nyaman & Berkah', type: 'Umrah', duration: '9 Hari', price: 'Rp 32.500.000', status: 'Tersedia' },
  { id: 2, name: 'Umrah Premium Executive', type: 'Umrah', duration: '12 Hari', price: 'Rp 48.900.000', status: 'Tersedia' },
  { id: 3, name: 'Haji Khusus QISWAH', type: 'Haji', duration: '25 Hari', price: 'Hubungi Kami', status: 'Konsultasi' }
];

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0)).replace('Rp', 'Rp ');
}

function publicPackage(row) {
  const duration = row.duration_days ? `${row.duration_days} Hari` : 'Program';
  const isContact = !row.price || Number(row.price) === 0;
  return {
    id: Number(row.id),
    name: row.name,
    type: String(row.type || '').replace(/^./, c => c.toUpperCase()),
    duration,
    price: isContact ? 'Hubungi Kami' : formatRupiah(row.price),
    status: row.status === 'published' && Number(row.available_quota ?? 1) > 0 ? 'Tersedia' : 'Konsultasi'
  };
}

async function dbReady() {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

app.get('/api/health', async (_req, res) => {
  const connected = await dbReady();
  res.status(connected || !pool ? 200 : 503).json({
    status: connected || !pool ? 'ok' : 'degraded',
    service: 'qiswah.id',
    database: connected ? 'connected' : pool ? 'unavailable' : 'not-configured',
    environment: process.env.VERCEL ? 'vercel' : 'node'
  });
});

app.get('/api/packages', async (_req, res) => {
  if (!pool) return res.json(demoPackages);
  try {
    const { rows } = await pool.query(`
      SELECT id, type, name, duration_days, price, status, available_quota
      FROM packages
      WHERE status = 'published'
      ORDER BY id ASC
    `);
    res.json(rows.length ? rows.map(publicPackage) : demoPackages);
  } catch (error) {
    console.error('packages query failed', error);
    res.json(demoPackages);
  }
});

app.post('/api/leads', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim();
  const interest = String(req.body.interest || '').trim();
  if (!name || !phone) return res.status(400).json({ message: 'Nama dan nomor WhatsApp wajib diisi.' });

  if (pool) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO leads (name, phone, email, source, interest, status)
         VALUES ($1, $2, NULLIF($3, ''), 'landing-page', NULLIF($4, ''), 'new')
         RETURNING id, created_at`,
        [name, phone, email, interest]
      );
      return res.status(201).json({ message: 'Konsultasi berhasil disimpan. Tim QISWAH akan menghubungi Anda.', lead: rows[0] });
    } catch (error) {
      console.error('lead insert failed', error);
      return res.status(503).json({ message: 'Database sedang tidak tersedia. Silakan coba kembali.' });
    }
  }

  return res.status(201).json({ message: 'Konsultasi demo berhasil diterima.', lead: { name, phone, email, interest } });
});

app.post('/api/chat', async (req, res) => {
  const q = String(req.body.message || '').trim();
  const lower = q.toLowerCase();
  let answer = 'Assalamu’alaikum. Saya Asisten QISWAH.id. Saya siap membantu informasi paket Umrah dan Haji.';
  if (lower.includes('harga') || lower.includes('biaya')) answer = 'Harga paket terbaru tersedia pada bagian Paket QISWAH. Untuk program khusus, silakan kirim konsultasi.';
  else if (lower.includes('booking') || lower.includes('daftar')) answer = 'Silakan pilih paket lalu isi form Konsultasi. Tim QISWAH akan membantu proses pendaftaran.';
  else if (lower.includes('haji')) answer = 'QISWAH melayani informasi Haji Khusus. Kirim konsultasi untuk detail program dan jadwal.';
  else if (lower.includes('umrah')) answer = 'QISWAH menyediakan beberapa pilihan program Umrah. Silakan lihat paket yang tersedia di halaman ini.';

  if (pool && q) {
    try {
      await pool.query('INSERT INTO chat_messages (session_id, role, message) VALUES ($1, $2, $3)', [req.headers['x-session-id'] || null, 'user', q]);
      await pool.query('INSERT INTO chat_messages (session_id, role, message) VALUES ($1, $2, $3)', [req.headers['x-session-id'] || null, 'assistant', answer]);
    } catch (error) {
      console.error('chat persistence failed', error);
    }
  }
  res.json({ answer });
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`QISWAH.id listening on ${port}; database=${pool ? 'configured' : 'not-configured'}`));
