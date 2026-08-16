import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const packages = [
  { id: 1, name: 'Umrah Nyaman & Berkah', type: 'Umrah', duration: '9 Hari', price: 'Rp 32.500.000', status: 'Tersedia' },
  { id: 2, name: 'Umrah Premium Executive', type: 'Umrah', duration: '12 Hari', price: 'Rp 48.900.000', status: 'Tersedia' },
  { id: 3, name: 'Haji Khusus QISWAH', type: 'Haji', duration: '25 Hari', price: 'Hubungi Kami', status: 'Konsultasi' }
];

const leads = [];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qiswah.id', database: process.env.DATABASE_URL ? 'configured' : 'not-configured' });
});

app.get('/api/packages', (_req, res) => res.json(packages));

app.post('/api/leads', (req, res) => {
  const lead = {
    id: leads.length + 1,
    name: String(req.body.name || '').trim(),
    phone: String(req.body.phone || '').trim(),
    email: String(req.body.email || '').trim(),
    interest: String(req.body.interest || '').trim(),
    createdAt: new Date().toISOString()
  };
  if (!lead.name || !lead.phone) return res.status(400).json({ message: 'Nama dan nomor WhatsApp wajib diisi.' });
  leads.push(lead);
  res.status(201).json({ message: 'Konsultasi berhasil dikirim. Tim QISWAH akan menghubungi Anda.', lead });
});

app.post('/api/chat', (req, res) => {
  const q = String(req.body.message || '').toLowerCase();
  let answer = 'Assalamu’alaikum. Saya Asisten QISWAH.id. Saya siap membantu informasi paket Umrah dan Haji.';
  if (q.includes('harga') || q.includes('biaya')) answer = 'Harga paket dapat dilihat pada bagian Paket QISWAH. Untuk kebutuhan khusus, silakan kirim konsultasi agar tim memberikan penawaran terbaru.';
  else if (q.includes('booking') || q.includes('daftar') || q.includes('daftar')) answer = 'Tentu. Silakan isi form Konsultasi Perjalanan dan tim QISWAH akan membantu proses pendaftaran.';
  else if (q.includes('haji')) answer = 'QISWAH menyediakan informasi Haji Khusus. Pilih paket Haji pada daftar paket atau kirim konsultasi untuk detail program.';
  else if (q.includes('umrah')) answer = 'QISWAH menyediakan program Umrah dengan beberapa pilihan durasi. Silakan lihat Paket QISWAH di halaman ini.';
  res.json({ answer });
});

// Express 5-compatible fallback for the SPA/landing page.
app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`QISWAH.id listening on ${port}`));
