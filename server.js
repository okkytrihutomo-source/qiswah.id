import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const packages = [
  {id:1,name:'Umrah Nyaman & Berkah',type:'Umrah',duration:'9 Hari',price:'Rp 32.500.000',status:'Tersedia'},
  {id:2,name:'Umrah Premium Executive',type:'Umrah',duration:'12 Hari',price:'Rp 48.900.000',status:'Tersedia'},
  {id:3,name:'Haji Khusus Qiswah',type:'Haji',duration:'25 Hari',price:'Hubungi Kami',status:'Konsultasi'}
];
const leads=[];

app.get('/api/health', (_req,res)=>res.json({status:'ok',service:'qiswah.id',database:'Neon PostgreSQL configured'}));
app.get('/api/packages', (_req,res)=>res.json(packages));
app.post('/api/leads', (req,res)=>{ const lead={id:leads.length+1,...req.body,createdAt:new Date().toISOString()}; leads.push(lead); res.status(201).json({message:'Konsultasi berhasil dikirim',lead}); });
app.post('/api/chat', (req,res)=>{ const q=(req.body.message||'').toLowerCase(); let answer='Assalamu’alaikum. Saya Asisten QISWAH.id. Saya siap membantu informasi paket Umrah dan Haji.'; if(q.includes('harga')) answer='Untuk harga paket terbaru, silakan lihat daftar paket atau kirim kebutuhan Anda agar tim QISWAH membantu.'; if(q.includes('booking')||q.includes('daftar')) answer='Tentu. Silakan isi form konsultasi dan tim QISWAH akan menghubungi Anda.'; res.json({answer}); });
app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`QISWAH.id listening on ${port}`));
