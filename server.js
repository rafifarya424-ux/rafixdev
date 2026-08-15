require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8000;

// 1. MIDDLEWARE KEAMANAN
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "cdn.jsdelivr.net", "unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "unpkg.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            connectSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.tailwindcss.com", "cdn.jsdelivr.net", "unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            frameSrc: ["'self'"]
        }
    }
}));
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); 

// 2. RATE LIMITING (Mencegah Spam Form)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // Batasi setiap IP hanya 5 request per 15 menit
    message: { error: "Terlalu banyak permintaan dari IP ini, coba lagi setelah 15 menit." }
});

// 3. DATABASE SETUP
const db = new sqlite3.Database('./rafixdev.db', (err) => {
    if (err) {
        console.error("❌ Gagal terhubung ke database:", err.message);
    } else {
        console.log("✅ Terhubung ke database SQLite.");
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// 4. API ENDPOINTS
// Gunakan rate limiter khusus untuk endpoint kontak
app.post('/api/contact', apiLimiter, (req, res) => {
    const { name, email, message } = req.body;

    // Validasi input dasar
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Semua kolom wajib diisi!" });
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Format email tidak valid!" });
    }

    const sql = `INSERT INTO messages (name, email, message) VALUES (?, ?, ?)`;
    db.run(sql, [name, email, message], function(err) {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server." });
        }
        res.status(201).json({ 
            success: true, 
            message: "Terima kasih! Pesan Anda telah kami terima."
        });
    });
});

app.get('/api/messages', (req, res) => {
    db.all(`SELECT * FROM messages ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 5. JALANKAN SERVER
app.listen(PORT, () => {
    console.log(`🚀 Server Rafixdev berjalan di http://localhost:${PORT}`);
});