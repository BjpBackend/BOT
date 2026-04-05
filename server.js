require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

let lastMessageId = null; // Purane message ki ID save karne ke liye
let fullHistory = `*BJP Client's*\n\n`; // Saari history store karne ke liye

const sendOrUpdateTelegram = async (newEntry) => {
    fullHistory += newEntry + `\n`; // Nayi entry history mein add karein

    try {
        if (!lastMessageId) {
            // Agar pehla message hai, to naya bhejo
            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: fullHistory,
                parse_mode: 'Markdown'
            });
            lastMessageId = response.data.result.message_id; // ID save kar lo
        } else {
            // Agar pehle se message hai, to use hi EDIT karo
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                chat_id: CHAT_ID,
                message_id: lastMessageId,
                text: fullHistory,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        // Agar Edit fail ho (e.g. message delete ho gaya ho), to naya bhej do
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: fullHistory,
            parse_mode: 'Markdown'
        });
        lastMessageId = response.data.result.message_id;
    }
};

const startupNotification = async () => {
    // Startup par lastMessageId reset taaki naya session shuru ho
    lastMessageId = null;
    fullHistory = `*BJP Client's*\n\n`;
};

app.post('/send-data', async (req, res) => {
    const { deviceId, deviceTime, deviceDate } = req.body;
    
    // Nayi entry ka format jaisa aapne manga
    let entry = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
    entry += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
    entry += `*Real Time:* ${deviceTime || 'Detecting...'}\n`;

    await sendOrUpdateTelegram(entry);
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
    console.log(`Server running on port ${PORT}`);
});
