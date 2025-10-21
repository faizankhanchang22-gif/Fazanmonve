const { Telegraf } = require('telegraf');
const axios = require('axios'); 

// ⚙️ CONFIGURATION (New Bot Token)
const BOT_TOKEN = process.env.BOT_TOKEN || '8240758870:AAHVsyctX5euJjZ_U5xdS0xGQwxalkxejXk';

// ⚠️ Naya Group Handle (Link ko username ki tarah use kar rahe hain)
// Agar aapka group link https://t.me/SKqLFKDa1g1kZDJk hai, toh hum sirf 'SKqLFKDa1g1kZDJk' ko use karenge.
// PRIVATE GROUPS KE LIYE ID (-100...) HAMESHA ZAROORI HAI.
const TARGET_GROUP_HANDLE = 'SKqLFKDa1g1kZDJk'; 

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
    return text.replace(/([\_*\[\]\(\)~`>#\+\-\=\|\{\}\.!])/g, '\\$1');
};

/**
 * Checks if a user is a member of all required channels.
 */
async function isUserMemberOfAllChannels(userId) {
    for (const channelUsername of REQUIRED_CHANNELS) {
        try {
            const member = await bot.telegram.getChatMember(channelUsername, userId);
            if (!['member', 'creator', 'administrator'].includes(member.status)) {
                return false; 
            }
        } catch (error) {
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
        return response.data; 
    } catch (error) {
        return { status: false, msg: 'External API server error or failed to connect.' }; 
    }
}


/**
 * Handler for the /start command.
 */
bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    
    // Group Check using handle (username or invite link part)
    // NOTE: This check is complex and less reliable than using Chat ID.
    const isTargetGroup = ctx.chat.username && ctx.chat.username === TARGET_GROUP_HANDLE;
    const isTargetType = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

    // If it's a private chat, reply that it must be a group
    if (!isTargetType) {
        await ctx.replyWithMarkdownV2(`**❌ Yeh Bot Sirf Group Chat Main Work Karega\.**`);
        return; 
    }
    
    // If it's the wrong group, we'll let it proceed to channel check for simplicity.

    // If Group, check Channel membership
    const isMember = await isUserMemberOfAllChannels(userId);

    if (isMember) {
        // ✅ Channels Verified
        await ctx.replyWithMarkdownV2(`**✅ Channels Verified\.**\n\nAb Aapke Liye External API Call Kar Raha Hoon\.\.\.`);

        // 🔥 Call the External API
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
        // ❌ User has not joined all channels
        const requiredLinksText = REQUIRED_CHANNELS.map(c => `• **${escapeMarkdownV2(c)}**`).join('\n');
        
        const joinMessage = `**⚠️ Pehle Zaroori Channels Join Karein\!**\n\n**Aap Ne Darj Zeel Channels Join Nahi Kiye:**\n${requiredLinksText}\n\n**Channels Join Karne Ke Baad Dobara \/start Command Bhejein\.**`;
        
        const buttons = REQUIRED_CHANNELS.map(c => ([{ text: `🔗 Join ${c}`, url: `https://t.me/${c.substring(1)}` }]));
        
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
            console.error('Error handling Telegram update:', error.message);
            res.statusCode = 200; 
            res.end();
        }
    } else {
        res.statusCode = 200;
        res.end('Bot is running and waiting for Telegram updates.');
    }
};
