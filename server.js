const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || puppeteer.executablePath(), // Use system-installed Chrome
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--single-process", // Important for Render
            "--no-zygote"
        ]
    }
});

// Generate QR Code
client.on('qr', (qr) => {
    console.log("Scan this QR code with WhatsApp:");
    io.emit('qr', qr);
});

// When WhatsApp is ready
client.on('ready', () => {
    console.log('WhatsApp Web is ready!');
    io.emit('ready', 'WhatsApp Web is ready');
});

// Send Message API
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: "Please provide both number and message." });
    }

    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true, message: `Message sent to ${number}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start WhatsApp client
client.initialize();

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
