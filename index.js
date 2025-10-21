const { Telegraf } = require('telegraf');
const axios = require('axios'); 

// ⚙️ CONFIGURATION (Updated with New Token)
// **NEW BOT TOKEN:**
const BOT_TOKEN = process.env.BOT_TOKEN || '8240758870:AAHVsyctX5euJjZ_U5xdS0xGQwxalkxejXk';

// Group chat ID where the bot must work.
const TARGET_GROUP_ID = -1003089918721; 

// List of mandatory channel usernames for joining.
const REQUIRED_CHANNELS = [
    '@freefirelkies',
    '@owner_of_this_all'
];

const bot = new Telegraf(BOT_TOKEN);

/**
 * Escapes text for safe use with MarkdownV2 formatting.
 */
const escapeMarkdownV2 = (text) => {
    // Escapes common MarkdownV2 special characters.
    return text.replace(/([\_*\[\]\(\)~`>#\+\-\=\|\{\}\.!])/g, '\\$1');
};

/**
 * Checks if a user is a member of all required channels (using usernames).
 */
async function isUserMemberOfAllChannels(userId) {
    for (const channelUsername of REQUIRED_CHANNELS) {
        try {
            const member = await bot.telegram.getChatMember(channelUsername, userId);
            if (!['member', 'creator', 'administrator'].includes(member.status)) {
                return false; 
            }
        } catch (error) {
            // This is the error point if the bot is not admin in the channel.
            console.error(`Error checking channel membership for ${channelUsername}:`, error.message);
            return false; 
        }
    }
    return true; 
}

/**
 * Function to call the external API for likes.
 */
async function callExternalApi(userId) {
    const BASE_URL = 'http://69.62.118.156:19126/like';
    const params = {
        uid: userId, 
        server_name: 'ind',
        key: 'freeapi'
    };
    
    try {
        const response = await axios.get(BASE_URL, { params });
        console.log(`API Call Successful for UID ${userId}. Response:`, response.data);
        return response.data; 
    } catch (error) {
        console.error(`Error calling external API for UID ${userId}:`, error.message);
        return { status: false, msg: 'External API server error or failed to connect.' }; 
    }
}

/**
 * Middleware: Check if the message is from the target group.
 */
bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.id === TARGET_GROUP_ID) {
        return next(); 
    } else if (ctx.chat && ctx.chat.id !== TARGET_GROUP_ID) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
            await ctx.reply(`❌ **Yeh Bot Sirf Group Chat Main Work Karega\.**`);
        }
    }
});


/**
 * Handler for the /start command.
 */
bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await isUserMemberOfAllChannels(userId);

    if (isMember) {
        // ✅ STEP 1: Channels Verified
        // NOTE: Using replyWithMarkdownV2 and escaping text.
        await ctx.replyWithMarkdownV2(`**✅ Channels Verified\.**\n\nAb Aapke Liye External API Call Kar Raha Hoon\.\.\.`);

        // 🔥 STEP 2: Call the External API
        const apiResponse = await callExternalApi(userId);

        if (apiResponse && apiResponse.status === true) {
            const apiMsg = escapeMarkdownV2(apiResponse.msg || 'Done');
            const successMessage = `**🎉 Success\!**\n\n**Aapka Kaam Ho Gaya\.**\n\nAPI Status: ${apiMsg}`;
            await ctx.replyWithMarkdownV2(successMessage);
        } else {
            const apiMsg = escapeMarkdownV2(apiResponse.msg || 'No response received.');
            const failureMessage = `**❌ Error:** External API Call Mein Masla Hua\.\n\nAPI Response: ${apiMsg}`;
            await ctx.replyWithMarkdownV2(failureMessage);
        }

    } else {
        // ❌ Failure: User has not joined all channels
        const requiredLinksText = REQUIRED_CHANNELS.map(c => `• **${escapeMarkdownV2(c)}**`).join('\n');
        
        const joinMessage = `**⚠️ Pehle Zaroori Channels Join Karein\!**\n\n**Aap Ne Darj Zeel Channels Join Nahi Kiye:**\n${requiredLinksText}\n\n**Channels Join Karne Ke Baad Dobara \/start Command Bhejein\.**`;
        
        const buttons = REQUIRED_CHANNELS.map(c => ([{ text: `🔗 Join ${c}`, url: `https://t.me/${c.substring(1)}` }]));
        
        // NOTE: Using replyWithMarkdownV2
        await ctx.replyWithMarkdownV2(joinMessage, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
});


// 🚀 Vercel Export Setup (Handles GET vs POST requests gracefully)
module.exports = async (req, res) => {
    if (req.method === 'POST' && req.body) {
        try {
            await bot.handleUpdate(req.body, res);
        } catch (error) {
            // Log the error but send 200 OK so Telegram doesn't retry
            console.error('Error handling Telegram update:', error.message);
            res.statusCode = 200; 
            res.end();
        }
    } else {
        // Handles GET requests from browsers/Vercel monitors
        res.statusCode = 200;
        res.end('Bot is running and waiting for Telegram updates.');
    }
};

// Set commands for Telegram interface
bot.telegram.setMyCommands([
    { command: 'start', description: 'Bot ko start karein aur channels ki membership check karein.' }
]);