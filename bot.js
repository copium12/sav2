const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const OpenAI = require("openai");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();

let viewers = 0;

// simple cooldown for !ask
const askCooldown = new Map();

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

client.once('ready', () => {
    console.log("Stick Arena Bot Online");

    const channelId = "1481485311967100938";

    // Auto-post join message every 30 minutes
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

    // JOIN BUTTON COMMAND
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

    // AI COMMAND
    if (message.content.startsWith("!ai ")) {

        const userId = message.author.id;

        if (askCooldown.has(userId)) {
            return message.reply("⏳ Please wait a few seconds before asking again.");
        }

        askCooldown.set(userId, true);
        setTimeout(() => askCooldown.delete(userId), 5000);

        const question = message.content.replace("!ai ", "");

        try {

            await message.channel.send("🤖 thinking...");

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant in a Discord server for Stick Arena V2."
                    },
                    {
                        role: "user",
                        content: question
                    }
                ]
            });

            let reply = completion.choices[0].message.content;

            // Discord max message limit protection
            if (reply.length > 2000) {
                reply = reply.slice(0,1990) + "...";
            }

            message.reply(reply);

        } catch (err) {
            console.log(err);
            message.reply("⚠️ AI request failed.");
        }

    }

});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});