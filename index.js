const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot('7913269120:AAHyaBpD1G3NsrI7fKLdS3CNtoMocAUQ3L8', { polling: true });

const app = express();
const CHANNEL_USERNAME = "@Asrorbek_blo"; // Kanal username (t.me/ ni olib tashlang)

// ✅ Obuna tekshirish funksiyasi
async function checkSubscription(chatId, userId) {
    try {
        const res = await bot.getChatMember(CHANNEL_USERNAME, userId);
        const isMember = res.status === "member" || res.status === "administrator" || res.status === "creator";
        return isMember;
    } catch (error) {
        console.error("Obuna tekshirishda xatolik:", error);
        return false;
    }
}

// ✅ Foydalanuvchi `/start` bosganda faqat obuna tekshiramiz
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const isMember = await checkSubscription(chatId, userId);
    
    if (!isMember) {
        return bot.sendMessage(chatId, "📢 <b>Botdan foydalanish uchun avval kanalga obuna bo‘ling!</b>", {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔗 Obuna bo‘lish", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: "✅ Obunani tasdiqlash", callback_data: "check_subs" }]
                ]
            }
        });
    }

    bot.sendMessage(chatId, `👋 Assalomu alaykum, ${msg.from.first_name}! Botga xush kelibsiz!`, { parse_mode: "HTML" });
});

// ✅ "Obunani tasdiqlash" tugmasi bosilganda tekshiramiz
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    const isMember = await checkSubscription(chatId, userId);
    
    if (isMember) {
        bot.sendMessage(chatId, "✅ Rahmat! Siz obuna bo‘lgansiz. Endi botdan foydalanishingiz mumkin.", { parse_mode: "HTML" });
    } else {
        bot.answerCallbackQuery(query.id, { text: "❌ Siz hali obuna bo‘lmadingiz!", show_alert: true });
    }
});

//Faqat Instagram link yuborilganda video yuklash
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text;

    // Agar foydalanuvchi `/start` yoki boshqa buyruq yozgan bo‘lsa, hech narsa qilmaymiz
    if (!messageText.startsWith("http")) return;

    const isMember = await checkSubscription(chatId, userId);
    
    if (!isMember) {
        return bot.sendMessage(chatId, "📢 <b>Botdan foydalanish uchun avval bizning kanalga obuna bo‘ling!</b>", {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔗 Obuna bo‘lish", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: "✅ Obunani tasdiqlash", callback_data: "check_subs" }]
                ]
            }
        });
    }

    try {
        bot.sendMessage(chatId, "⏳ Video yuklanmoqda, biroz kuting...");

        const response = await downloadInsta(messageText);

        if (!response.data || !response.data.download_url || response.data.download_url.length === 0) {
            return bot.sendMessage(chatId, "❌ Video topilmadi yoki yuklab bo‘lmadi.");
        }

    

        const videoUrl = response.data.download_url;
        console.log(videoUrl)
        const username = response.data.author?.username || "Noma'lum";

        const caption = `📹 <b>Instagram-dan yuklangan video!</b>\n\n👤 <b>Muallif:</b> <a href="https://www.instagram.com/${username}">@${username}</a>\n`;

        if (!videoUrl) {
            return bot.sendMessage(chatId, "❌ Video URL noto‘g‘ri.");
        }

        const videoPath = path.join(__dirname, `video_${chatId}.mp4`);
        const writer = fs.createWriteStream(videoPath);

        const videoResponse = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
        videoResponse.data.pipe(writer);

        writer.on('finish', async () => {
            await bot.sendVideo(chatId, fs.createReadStream(videoPath), {
                caption: caption,
                parse_mode: "HTML",
            });

            fs.unlinkSync(videoPath); // Videoni o‘chiramiz
        })

    } catch (error) {
        console.error("Video yuklashda xatolik:", error);
        bot.sendMessage(chatId, "❌ Video yuklashda yoki jo‘natishda xatolik bor.");
    }
});

// ✅ Instagram video yuklash funksiyasi
const downloadInsta = async (insUrl = null) => {
    const options = {
        method: 'GET',
        url: 'https://instagram-downloader36.p.rapidapi.com/instagram',
        params: { insta_url: insUrl.toString() },
        headers: {
            'x-rapidapi-key': 'a0e3b481a2msh53a3f994c4266abp18c9aejsn087ffeb0144a',
            'x-rapidapi-host': 'instagram-downloader36.p.rapidapi.com'
        }
    };

    return await axios.request(options);
};

app.get("/", (req, res) => {
    res.send("Bot is running...");
  });
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });