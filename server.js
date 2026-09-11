const express = require('express');
const cors = require('cors');
const mineflayer = require('mineflayer');

const app = express();
app.use(express.json());
app.use(cors());

const activeBots = {};

app.post('/api/bot/start', (req, res) => {
    const { host, port, username, version } = req.body;
    const botId = `${host}:${port}:${username}`;

    if (activeBots[botId]) {
        return res.json({ success: true, message: 'البوت متصل بالفعل بالسيرفر!' });
    }

    const botOptions = {
        host: host,
        port: parseInt(port) || 25565,
        username: username || 'AFK_Keeper_247'
    };

    if (version && version !== 'auto') {
        botOptions.version = version;
    }

    let isResponded = false; // لمنع إرسال أكثر من رد للواجهة

    try {
        const bot = mineflayer.createBot(botOptions);

        // 1. نجاح الاتصال والدخول الفعلي للعبة
        bot.once('spawn', () => {
            console.log(`[+] نجح البوت ${username} في الدخول إلى ${host}`);
            
            bot.afkInterval = setInterval(() => {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }, 30000);

            activeBots[botId] = bot;

            if (!isResponded) {
                isResponded = true;
                return res.json({ success: true, message: 'تم دخول البوت السيرفر بنجاح وهو متصل الآن!' });
            }
        });

        // 2. فشل الاتصال (السيرفر مغلق / أوفلاين)
        bot.once('error', (err) => {
            console.error(`[-] فشل اتصال البوت: ${err.message}`);
            if (bot.afkInterval) clearInterval(bot.afkInterval);
            bot.end();
            delete activeBots[botId];

            if (!isResponded) {
                isResponded = true;
                return res.status(400).json({ 
                    success: false, 
                    message: 'السيرفر مغلق (Offline) أو الـ IP غير صحيح! يرجى تشغيل السيرفر أولاً.' 
                });
            }
        });

        bot.on('end', () => {
            if (bot.afkInterval) clearInterval(bot.afkInterval);
            delete activeBots[botId];
        });

        // 3. المهلة الزمنية (Timeout): إذا لم يستجب السيرفر خلال 15 ثانية
        setTimeout(() => {
            if (!isResponded) {
                isResponded = true;
                bot.end();
                delete activeBots[botId];
                return res.status(408).json({ 
                    success: false, 
                    message: 'انتهت مهلة الاتصال! السيرفر لا يستجيب غالباً لأنه غير مفعّل.' 
                });
            }
        }, 15000);

    } catch (err) {
        if (!isResponded) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
});

app.post('/api/bot/stop', (req, res) => {
    const { host, port, username } = req.body;
    const botId = `${host}:${port}:${username}`;

    if (activeBots[botId]) {
        activeBots[botId].quit();
        if (activeBots[botId].afkInterval) clearInterval(activeBots[botId].afkInterval);
        delete activeBots[botId];
        return res.json({ success: true, message: 'تم إخراج البوت وإيقافه بنجاح.' });
    }

    res.json({ success: false, message: 'البوت غير متصل بالأصل.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل بدقة على المنفذ ${PORT}`));
