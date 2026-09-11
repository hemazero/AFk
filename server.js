const express = require('express');
const cors = require('cors');
const mineflayer = require('mineflayer');

const app = express();
app.use(express.json());
app.use(cors()); // للسماح للواجهة بالتواصل مع السيرفر

// تخزين البوتات النشطة
const activeBots = {};

// Express API: بدء تشغيل البوت
app.post('/api/bot/start', (req, res) => {
    const { host, port, username, version } = req.body;
    const botId = `${host}:${port}:${username}`;

    if (activeBots[botId]) {
        return res.json({ success: true, message: 'البوت يعمل بالفعل!' });
    }

    try {
        const botOptions = {
            host: host,
            port: parseInt(port) || 25565,
            username: username || 'AFK_Keeper_247'
        };

        if (version && version !== 'auto') {
            botOptions.version = version;
        }

        const bot = mineflayer.createBot(botOptions);

        bot.on('spawn', () => {
            console.log(`[+] البوت ${username} دخل السيرفر ${host}`);
            
            // Anti-AFK Loop: قفز كل 30 ثانية لمنع الـ Kick
            bot.afkInterval = setInterval(() => {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }, 30000);
        });

        bot.on('end', () => {
            console.log(`[-] البوت ${username} تم فصله من ${host}`);
            if (bot.afkInterval) clearInterval(bot.afkInterval);
            delete activeBots[botId];
        });

        bot.on('error', (err) => {
            console.error(`[!] خطأ في البوت ${username}:`, err.message);
            if (bot.afkInterval) clearInterval(bot.afkInterval);
            delete activeBots[botId];
        });

        activeBots[botId] = bot;
        res.json({ success: true, message: 'جاري تشغيل البوت والاتصال بالسيرفر...' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Express API: إيقاف البوت
app.post('/api/bot/stop', (req, res) => {
    const { host, port, username } = req.body;
    const botId = `${host}:${port}:${username}`;

    if (activeBots[botId]) {
        activeBots[botId].quit();
        if (activeBots[botId].afkInterval) clearInterval(activeBots[botId].afkInterval);
        delete activeBots[botId];
        return res.json({ success: true, message: 'تم إيقاف البوت بنجاح.' });
    }

    res.json({ success: false, message: 'لم يتم العثور على البوت المحدد.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر الخلفي يعمل على المنفذ ${PORT}`));