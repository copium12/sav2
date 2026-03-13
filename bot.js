const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require("fs");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();

let viewers = 0;

const memory = new Map();
const cooldown = new Map();

/* ROLE THAT CAN TRAIN THE AI */
const knowledgeRoleId = "1032830761314832448";

/* LOAD KNOWLEDGE FILE */
let knowledge = [];

if (fs.existsSync("knowledge.json")) {
    knowledge = JSON.parse(fs.readFileSync("knowledge.json"));
}

app.use(express.json());

/* PLAYER COUNT CHANNEL */
const playerChannelId = "1481485311967100938";

async function updatePlayerChannel() {

    try {

        const channel = await client.channels.fetch(playerChannelId);

        if (!channel) return;

        const newName = `🟢┃𝙊𝙉𝙇𝙄𝙉𝙀 𝘾𝙊𝙐𝙉𝙏 ${viewers}`;

        if (channel.name !== newName) {
            await channel.setName(newName);
        }

    } catch (err) {
        console.log("Channel update error:", err);
    }

}

/* HEALTH CHECK */
app.get("/", (req, res) => {
    res.send("Bot is alive");
});

/* PLAYER TRACKING */
app.post("/join", (req,res)=>{
    viewers++;
    console.log("viewer joined:", viewers);
    updatePlayerChannel();
    res.sendStatus(200);
});

app.post("/leave", (req,res)=>{
    viewers = Math.max(0, viewers - 1);
    console.log("viewer left:", viewers);
    updatePlayerChannel();
    res.sendStatus(200);
});

/* BOT READY */
client.once('clientReady', async () => {
    console.log("Stick Arena Bot Online");
    updatePlayerChannel();
});

/* MESSAGE HANDLER */
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    const learnText = message.content.toLowerCase();

    /* LEARN ONLY FROM TRAINER ROLE */
    if (
        message.member &&
        message.member.roles.cache.has(knowledgeRoleId) &&
        learnText.length > 20 &&
        !learnText.startsWith("!") &&
        !learnText.includes("http") &&
        !learnText.includes("@")
    ) {

        knowledge.push(learnText);

        if (knowledge.length > 500) {
            knowledge.shift();
        }

        fs.writeFileSync("knowledge.json", JSON.stringify(knowledge, null, 2));
        console.log("AI learned:", learnText);
    }

    /* GAME COMMAND */
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

    /* SMART KNOWLEDGE SEARCH */
    const words = cleanMessage.split(" ");

    let relevantKnowledge = knowledge.filter(line =>
        words.some(word => line.includes(word))
    );

    if (relevantKnowledge.length === 0) {
        relevantKnowledge = knowledge.slice(0, 20);
    }

    relevantKnowledge = relevantKnowledge.slice(0, 20).join("\n");

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

Stick Arena knowledge comes from the original XGen Studios Stick Arena game and its Ballistick expansion.

Stick Arena V2 continues the same arena combat gameplay.

Official site:
https://us.stickarena.fun/

Speak casually like a community member. Use slang occasionally like bro or gang.

Relevant Stick Arena knowledge:
${relevantKnowledge}
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Tracker running on port ${PORT}`);
});