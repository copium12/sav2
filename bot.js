const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require("fs");
const Canvas = require("canvas");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const app = express();

let viewers = 0;

const memory = new Map();
const cooldown = new Map();

const knowledgeRoleId = "1032830761314832448";

const playerChannelId = "1481485311967100938";
const welcomeChannelId = "1450265385445097654";

/* LOAD KNOWLEDGE */
let knowledge = [];

if (fs.existsSync("knowledge.json")) {
    knowledge = JSON.parse(fs.readFileSync("knowledge.json"));
}

app.use(express.json());

/* PLAYER COUNT CHANNEL */
async function updatePlayerChannel() {

    try {

        const channel = await client.channels.fetch(playerChannelId);

        const newName = `🟢┃𝙊𝙉𝙇𝙄𝙉𝙀 𝘾𝙊𝙐𝙉𝙏 ${viewers}`;

        if (channel.name !== newName) {
            await channel.setName(newName);
        }

    } catch (err) {
        console.log("Channel update error:", err);
    }

}

/* HEALTH */
app.get("/", (req, res) => {
    res.send("Bot is alive");
});

/* PLAYER TRACKING */
app.post("/join", (req,res)=>{
    viewers++;
    updatePlayerChannel();
    res.sendStatus(200);
});

app.post("/leave", (req,res)=>{
    viewers = Math.max(0, viewers - 1);
    updatePlayerChannel();
    res.sendStatus(200);
});

/* BOT READY */
client.once('clientReady', async () => {

    console.log("Stick Arena Bot Online");

    updatePlayerChannel();

});

/* WELCOME SYSTEM */
client.on('guildMemberAdd', async (member) => {

    try {

        await member.send(`🔥 **Welcome to Stick Arena V2, ${member.user.username}!** ⚔️

You're now part of the community!

Everything you need to get started — including the official website and mobile version — can be found in the **links channel**:
https://discord.com/channels/1032830761314832444/1478084954796593152

Looking for a match? Just type **@Active** in chat and anyone available will hop in and run a game with you.

Lock in and we’ll see you in the arena. 🥊`);

    } catch (err) {

        console.log("Could not DM user:", err.message);

    }

    try {

        const canvas = Canvas.createCanvas(1000, 400);
        const ctx = canvas.getContext("2d");

        /* SERVER BANNER */

        let bannerURL = member.guild.bannerURL({ extension: "png", size: 1024 });

        if (!bannerURL) {
            bannerURL = "https://i.imgur.com/0j0Z8FZ.png";
        }

        const banner = await Canvas.loadImage(bannerURL);

        ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);

        /* DARK OVERLAY */

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0,0,canvas.width,canvas.height);

        /* USERNAME */

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 50px sans-serif";
        ctx.fillText(member.user.username, 350, 200);

        /* MEMBER COUNT */

        ctx.font = "32px sans-serif";
        ctx.fillText(`Member #${member.guild.memberCount}`, 350, 260);

        /* AVATAR */

        const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: "png" }));

        ctx.save();

        ctx.beginPath();
        ctx.arc(170, 200, 120, 0, Math.PI * 2, true);
        ctx.closePath();

        ctx.clip();

        ctx.drawImage(avatar, 50, 80, 240, 240);

        ctx.restore();

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "welcome.png" });

        const channel = await client.channels.fetch(welcomeChannelId);

        const waveButton = new ButtonBuilder()
            .setCustomId(`wave_${member.id}`)
            .setLabel("👋 Wave to say hi")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(waveButton);

        await channel.send({
            content: `👋 Everyone welcome **${member.user.username}** to the server!`,
            files: [attachment],
            components: [row]
        });

    } catch (err) {

        console.log("Welcome image error:", err);

    }

});

/* MESSAGE HANDLER */

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    if (message.content === "!game") {

        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 NOW ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app/");

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({
            content: `⚔️ **STICK ARENA V2**

🟢 Online Count ${viewers}`,
            components: [row]
        });

    }

});

/* WAVE BUTTON */

client.on('interactionCreate', async interaction => {

    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("wave_")) {

        await interaction.reply({
            content: `👋 ${interaction.user} waved hello!`,
            ephemeral: false
        });

    }

});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});