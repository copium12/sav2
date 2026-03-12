const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();

let viewers = 0;

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

    const channelId = "1481474691917942854";

    // Update channel viewer count
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(channelId);

            if(channel){
                channel.setName(`🟢┃𝙊𝙣𝙡𝙞𝙣𝙚 𝘾𝙤𝙪𝙣𝙩-${viewers}`);
            }

        } catch(err){
            console.log(err);
        }

    }, 5000);

    // Auto-post join message every 30 minutes
    setInterval(async () => {

        try {

            const channel = await client.channels.fetch(channelId);

            const button = new ButtonBuilder()
                .setLabel("ENTER ARENA ⚔️")
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

    }, 1800000); // 30 minutes
});

client.on('messageCreate', async (message) => {

    if (message.content === "!arena") {

        const button = new ButtonBuilder()
            .setLabel("ENTER ARENA ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app");

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({
            content: `⚔️ **STICK ARENA V2**

🟢 𝙊𝙣𝙡𝙞𝙣𝙚 𝘾𝙤𝙪𝙣𝙩 ${viewers}`,
            components: [row]
        });

    }

});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});