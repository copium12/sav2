const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();

let viewers = 0;

const memory = new Map();
const cooldown = new Map();

app.use(express.json());

/* HEALTH CHECK FOR UPTIMEROBOT */
app.get("/", (req, res) => {
    res.send("Bot is alive");
});

/* PLAYER TRACKING */
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

/* BOT READY */
client.once('clientReady', () => {

    console.log("Stick Arena Bot Online");

    const channelId = "1481485311967100938";

    setInterval(async () => {

        try {

            const channel = await client.channels.fetch(channelId);

            const button = new ButtonBuilder()
                .setLabel("JOIN SAV2 NOW ⚔️")
                .setStyle(ButtonStyle.Link)
                .setURL("https://us.stickarena.fun/");

            const row = new ActionRowBuilder().addComponents(button);

            await channel.send({
                content: `⚔️ **STICK ARENA V2**

🟢 Online Count ${viewers}`,
                components: [row]
            });

        } catch(err){
            console.log(err);
        }

    }, 1800000);

});

/* MESSAGE HANDLER */
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    /* GAME COMMAND */
    if (message.content === "!game") {

        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 NOW ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://us.stickarena.fun/");

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({
            content: `⚔️ **STICK ARENA V2**

🟢 Online Count ${viewers}`,
            components: [row]
        });

    }

    if (!message.mentions.has(client.user)) return;

    const cleanMessage = message.content
        .replace(`<@${client.user.id}>`, "")
        .trim()
        .toLowerCase();

    /* RULES RESPONSE */
    if (cleanMessage.includes("rules")) {
        return message.reply(`
We’re adults.
Act like it.

No slurs.
No racist or homophobic shit.

Trolling is cool.
Being toxic every day, starting drama, or constantly targeting people isn’t.

Don’t bring outside beef in here.
Handle it in DMs.

If staff tells you to chill, chill.

We’ll usually do:
Warning → Another warning → Talk → Timeout → Ban

Some stuff skips steps.

Simple: don’t make the server worse for everyone else.
`);
    }

    /* PLAY LINK */
    if (
        cleanMessage.includes("play") ||
        cleanMessage.includes("join") ||
        cleanMessage.includes("where")
    ) {
        return message.reply(`
Yo bro you can play Stick Arena right here:

https://us.stickarena.fun/

Just load it up and hop in a match.
`);
    }

    /* PLAYER COUNT */
    if (cleanMessage.includes("players") || cleanMessage.includes("online")) {
        return message.reply(`🟢 Yo gang we got **${viewers} players online** right now.`);
    }

    const userId = message.author.id;

    /* COOLDOWN */
    if (cooldown.get(userId) > Date.now()) {
        return message.reply("⏳ Chill for a second bro.");
    }

    cooldown.set(userId, Date.now() + 5000);

    await message.channel.sendTyping();

    if (!memory.has(userId)) memory.set(userId, []);

    const history = memory.get(userId);

    history.push({
        role: "user",
        content: cleanMessage
    });

    if (history.length > 6) history.shift();

    try {

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                     content: `
You are SAV2, the assistant for the Stick Arena V2 Discord server.

Your personality:
• talk casually like you're part of the community
• sometimes say things like bro, gang, yo
• keep responses short and natural

Server knowledge:
• official game site: https://us.stickarena.fun/
• help players understand rules and how to join

General knowledge:
• you can answer normal questions about weather, technology, history, etc.
• if a question isn't about the server, still answer it normally

Always stay respectful and helpful.
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

        const reply = response.data.choices[0].message.content;

        history.push({
            role: "assistant",
            content: reply
        });

        memory.set(userId, history);

        message.reply(reply);

    } catch (err) {

        console.log("AI ERROR:", err.response?.data || err.message);
        message.reply("⚠️ AI bugged out for a second gang.");

    }

});

client.login(process.env.TOKEN);

/* EXPRESS SERVER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});