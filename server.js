const cors = require('cors'); // Import CORS
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins (change this in production)
        methods: ["GET", "POST"]
    }
});

// Enable CORS for all routes
app.use(cors());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,  // Open browser window (for debugging)
        executablePath: require('puppeteer').executablePath(), // Use default Chromium path
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    }
});


client.on('qr', (qr) => {
    console.log("QR Code received, scan it with your phone.");
    io.emit('qr', qr);
});

client.on('ready', async () => {
    console.log('Client is ready!');
    io.emit('ready', 'WhatsApp Web is ready');

    // Fetch all chats
    const chats = await client.getChats();
    
    let chatData = [];
    for (let chat of chats) {
        // Get the last 5 messages from each chat
        const messages = await chat.fetchMessages({ limit: 5 });

        chatData.push({
            id: chat.id._serialized, 
            name: chat.name || chat.id.user,
            messages: messages.map(msg => ({
                from: msg.fromMe ? "You" : msg.author || msg.from,
                body: msg.body,
                timestamp: msg.timestamp
            }))
        });
    }

    io.emit('chats', chatData); // Send chat history to frontend
});


client.on('message', async (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);
    io.emit('message', { from: message.from, body: message.body });
});

client.initialize();

app.get('/', (req, res) => {
    res.send('WhatsApp Web Bot Running...');
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
