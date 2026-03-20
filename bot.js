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
        await member.send(`🔥 Welcome to Stick Arena V2, ${member.user.username}!`);
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

if(message.author.bot) return;

/* GAME BUTTON */

if(message.content === "!game"){
const button = new ButtonBuilder()
.setLabel("JOIN SAV2 NOW ⚔️")
.setStyle(ButtonStyle.Link)
.setURL("https://stickarenav2.netlify.app/join.html");

await message.channel.send({
content:`⚔️ SAV2\n\nClick below to join`,
components:[new ActionRowBuilder().addComponents(button)]
});
}

/* =========================
   REAL-TIME SMART RESPONSES
========================= */

const msg = message.content.toLowerCase();

// date
if (msg.includes("date")) {
    return message.reply(`📅 Today is ${new Date().toLocaleDateString()}`);
}

// time
if (msg.includes("time")) {
    return message.reply(`⏰ It’s ${new Date().toLocaleTimeString()}`);
}

// day
if (msg.includes("what day")) {
    return message.reply(`📆 Today is ${new Date().toLocaleString('en-US', { weekday: 'long' })}`);
}

/* =========================
   AI CHAT
========================= */

if(!message.mentions.has(client.user)) return;

const clean = message.content.replace(`<@${client.user.id}>`,"").trim();
const userId = message.author.id;

if(cooldown.get(userId) > Date.now()){
return message.reply("⏳ chill bro");
}

cooldown.set(userId, Date.now() + 4000);

await message.channel.sendTyping();

if(!memory.has(userId)) memory.set(userId,[]);
const history = memory.get(userId);

history.push({role:"user",content:clean});
if(history.length > 6) history.shift();

const now = new Date();

try {

const res = await axios.post(
"https://api.groq.com/openai/v1/chat/completions",
{
model:"llama-3.1-8b-instant",
messages:[
{
role:"system",
content: `
You are SAV2, a real Discord user.

Be casual, funny, short.

You know:
- Today’s date: ${now.toLocaleDateString()}
- Current time: ${now.toLocaleTimeString()}
- Day: ${now.toLocaleString('en-US', { weekday: 'long' })}

Answer naturally like a real person.
Use slang sometimes.
Never sound like AI.
Keep responses short.
`
},
...history
]
},
{
headers:{
Authorization:`Bearer ${process.env.GROQ_KEY}`,
"Content-Type":"application/json"
}
}
);

let reply = res.data.choices[0].message.content;

// prevent crash
if (reply.length > 1900) reply = reply.slice(0, 1900);

history.push({role:"assistant",content:reply});
memory.set(userId,history);

message.reply(reply);

} catch(err) {
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