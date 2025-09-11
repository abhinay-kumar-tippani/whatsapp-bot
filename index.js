// index.js
require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET = process.env.TARGET_NUMBER; // e.g. 919876543210

if (!TARGET) {
  console.error("⚠️  Set TARGET_NUMBER in .env (format: 9198xxxxxxxx, no + or spaces).");
  process.exit(1);
}

let latestQr = null;
let latestQrDataUrl = null;
let loggedIn = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

// When QR is generated
client.on('qr', (qr) => {
  latestQr = qr;
  loggedIn = false;
  qrcodeTerminal.generate(qr, { small: true }); // ASCII QR in logs
  qrcode.toDataURL(qr).then(url => { latestQrDataUrl = url; });
  console.log("⚡ Scan QR at /qr with WhatsApp → Linked Devices");
});

// When WhatsApp is ready
client.on('ready', () => {
  console.log('✅ WhatsApp client ready!');
  loggedIn = true;

  // clear old QR
  latestQr = null;
  latestQrDataUrl = null;

  // --- Scheduled message job (IST) ---
  cron.schedule('*/5 16-21 * * *', () => {
    client.sendMessage(`${TARGET}@c.us`, 'Hi Akshaya ❤️')
      .then(() => console.log('✅ Message sent at', new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })))
      .catch(err => console.error('❌ Send error:', err));
  }, { timezone: 'Asia/Kolkata' });

  // --- Test cron: logs every minute in IST ---
  cron.schedule('* * * * *', () => {
    console.log("⏰ Test cron fired at", new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
  }, { timezone: 'Asia/Kolkata' });
});

client.on('disconnected', (reason) => {
  console.log('❌ Client disconnected:', reason);
  loggedIn = false;
});

client.initialize();

// ---------- Routes ----------
app.get('/', (req, res) => res.send('🚀 WhatsApp bot is running'));

app.get('/status', (req, res) => {
  res.json({
    loggedIn,
    target: TARGET,
    timezone: "Asia/Kolkata",
    schedule: "Every 5 minutes from 16:00 (4 PM) to 21:55 (9:55 PM)"
  });
});

app.get('/qr', (req, res) => {
  if (latestQrDataUrl) {
    return res.send(`<h3>Scan this QR with WhatsApp → Link a device</h3><img src="${latestQrDataUrl}" />`);
  }
  if (loggedIn) return res.send("✅ Already logged in. No QR needed.");
  return res.send("No QR generated yet. Check logs.");
});

// Start server
app.listen(PORT, () => console.log(`🌍 Server running on http://localhost:${PORT}`));
