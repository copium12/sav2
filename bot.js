const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const express = require("express");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const memory = new Map();
const cooldown = new Map();

const welcomeChannelId = "1450265385445097654";

/* =========================
   READY
========================= */

client.once("ready", () => {
    console.log("Stick Arena Bot Online");
});

/* =========================
   WELCOME
========================= */

client.on("guildMemberAdd", async (member) => {
    try {
        await member.send(`🔥 **Welcome to Stick Arena V2, ${member.user.username}!** ⚔️

You're now part of the community!

📎 Everything you need can be found here:
https://discord.com/channels/1032830761314832444/1478084954796593152

🎮 Want to play?
Just type **@Active** in chat and players will jump in.

See you in the arena 🥊`);
    } catch {}

    try {
        const channel = await client.channels.fetch(welcomeChannelId);

        const waveButton = new ButtonBuilder()
            .setCustomId(`wave_${member.id}`)
            .setLabel("👋 Wave to say hi")
            .setStyle(ButtonStyle.Success);

        await channel.send({
            content: `👋 Everyone welcome <@${member.id}> to **Stick Arena V2!**`,
            components: [new ActionRowBuilder().addComponents(waveButton)]
        });

    } catch (err) {
        console.log(err);
    }
});

/* =========================
   BUTTON
========================= */

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("wave_")) {
        await interaction.reply({ content: `👋 ${interaction.user} waved hello!` });
    }
});

/* =========================
   MESSAGE HANDLER
========================= */

client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    /* GAME BUTTON */

    if (message.content === "!game") {
        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 NOW ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app/join.html");

        await message.channel.send({
            content: `⚔️ SAV2\n\nClick below to join`,
            components: [new ActionRowBuilder().addComponents(button)]
        });
    }

    /* REQUIRE MENTION FOR AI */

    if (!message.mentions.has(client.user)) return;

    const clean = message.content
        .replace(`<@${client.user.id}>`, "")
        .trim();

    const userId = message.author.id;

    /* COOLDOWN */

    if (cooldown.get(userId) > Date.now()) {
        return message.reply("⏳ chill bro");
    }

    cooldown.set(userId, Date.now() + 4000);

    await message.channel.sendTyping();

    /* MEMORY */

    if (!memory.has(userId)) memory.set(userId, []);
    const history = memory.get(userId);

    history.push({ role: "user", content: clean });
    if (history.length > 6) history.shift();

    /* PERSONALITY */

    const vibes = [
        "be funny and slightly sarcastic",
        "be chill and helpful",
        "be casual and short",
        "be playful and a little toxic but not offensive"
    ];

    const vibe = vibes[Math.floor(Math.random() * vibes.length)];

    try {

        const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `
You are SAV2, a real Discord user.

${vibe}.

Talk naturally like a real person.
Use slang casually.
Keep responses short.
Never sound like AI.
`
                    },
                    ...history
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let reply = res.data.choices[0].message.content;

        /* PREVENT LONG MESSAGES */

        if (reply.length > 1900) {
            reply = reply.slice(0, 1900);
        }

        history.push({ role: "assistant", content: reply });
        memory.set(userId, history);

        message.reply(reply);

    } catch (err) {
        console.log(err);
        message.reply("ngl I lagged 😭");
    }

});

/* =========================
   KEEP RENDER ALIVE
========================= */

const app = express();

app.get("/", (req, res) => res.send("alive"));

app.listen(process.env.PORT || 3000, () => {
    console.log("Web service active");
});

/* =========================
   LOGIN
========================= */

client.login(process.env.TOKEN);