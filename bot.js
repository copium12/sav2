const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();

let viewers = Math.max(0, viewers - 1);

app.use(express.json());

app.post("/join", (req,res)=>{
    viewers++;
    console.log("viewer joined:", viewers);
    res.sendStatus(200);
});

app.post("/leave", (req,res)=>{
    viewers--;
    console.log("viewer left:", viewers);
    res.sendStatus(200);
});

client.once('ready', () => {
    console.log("Stick Arena Bot Online");

    const channelId = "1481474691917942854";

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
});
client.on('messageCreate', async (message) => {

    if (message.content === "!arena") {

        const button = new ButtonBuilder()
            .setLabel("ENTER ARENA ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app");

        const row = new ActionRowBuilder().addComponents(button);

        panelMessage = await message.channel.send({
            content: `⚔️ **STICK ARENA V2**

🟢 𝙊𝙣𝙡𝙞𝙣𝙚 𝘾𝙤𝙪𝙣𝙩${viewers}`,
            components: [row]
        });

    }

});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});