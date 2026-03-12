const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();

let viewers = 0;

// memory for AI conversations
const memory = new Map();

app.use(express.json());

app.post("/join", (req,res)=>{
    viewers++;
    console.log("viewer joined:", viewers);
    res.sendStatus(200);
});

app.post("/leave", (req,res)=>{
    viewers = Math.max(0, viewers - 1);
    console.log("viewer left:", viewers);
    res.sendStatus(200);
});

client.once('clientReady', () => {
    console.log("Stick Arena Bot Online");

    const channelId = "1481485311967100938";

    setInterval(async () => {
        try {

            const channel = await client.channels.fetch(channelId);

            const button = new ButtonBuilder()
                .setLabel("JOIN SAV2 NOW ⚔️")
                .setStyle(ButtonStyle.Link)
                .setURL("https://stickarenav2.netlify.app");

            const row = new ActionRowBuilder().addComponents(button);

            await channel.send({
                content: `⚔️ **STICK ARENA V2**

🟢 𝙊𝙣𝙡𝙞𝙣𝙚 𝘾𝙤𝙪𝙣𝙩 ${viewers}`,
                components: [row]
            });

        } catch(err){
            console.log(err);
        }

    }, 1800000);
});

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    // GAME COMMAND
    if (message.content === "!game") {

        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 NOW ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app");

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({
            content: `⚔️ **STICK ARENA V2**

🟢 𝙊𝙣𝙡𝙞𝙣𝙚 𝘾𝙤𝙪𝙣𝙩 ${viewers}`,
            components: [row]
        });

    }

    // AI SYSTEM
    if (!message.mentions.has(client.user)) return;

    await message.channel.sendTyping();

    const userId = message.author.id;

    if (!memory.has(userId)) memory.set(userId, []);

    const history = memory.get(userId);

    const cleanMessage = message.content.replace(`<@${client.user.id}>`, "").trim();

    history.push({
        role: "user",
        content: cleanMessage
    });

    if (history.length > 6) history.shift();

    try {

        const response = await axios.post(
            "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.1",
            {
                inputs: cleanMessage
            }
        );

        let reply = "I couldn't generate a response.";

        if (Array.isArray(response.data) && response.data[0]?.generated_text) {
            reply = response.data[0].generated_text.replace(cleanMessage, "").trim();
        }

        history.push({
            role: "assistant",
            content: reply
        });

        memory.set(userId, history);

        message.reply(reply);

    } catch (err) {

        console.log("AI ERROR:", err.response?.data || err.message);
        message.reply("AI failed to respond.");

    }

});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});