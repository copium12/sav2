const { 
    Client, 
    GatewayIntentBits, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder 
} = require('discord.js');

const axios = require('axios');
const WebSocket = require('ws');
const express = require("express");

/* ================== CLIENT ================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ================== CONFIG ================== */

const playerChannelId = "1481485311967100938";
const welcomeChannelId = "1450265385445097654";

/* ================== MEMORY ================== */

const memory = new Map();
const cooldown = new Map();

/* ================== PLAYER TRACKER ================== */

const players = new Map(); // username -> lastSeen
let messageRef = null;

/* ================== WEBSOCKET TRACKER ================== */

function startTracker() {
    const ws = new WebSocket("wss://ws.stickarena.fun:1138");

    ws.on("open", () => {
        console.log("🔥 Connected to Stick Arena WS");
    });

    ws.on("message", (data) => {
    const msg = data.toString();

    // only care about player update packets
    if (!msg.startsWith("U1")) return;

    try {
        // remove hashes (they're padding)
        const clean = msg.replace(/#+/g, "");

        // split by separators
        const parts = clean.split(/[;:]/);

        for (let part of parts) {
            part = part.trim();

            // username rules
            if (
                part.length >= 2 &&
                part.length <= 16 &&
                /^[a-zA-Z0-9_]+$/.test(part) &&
                !part.match(/^\d+$/) // skip pure numbers
            ) {
                handleJoin(part);
            }
        }

    } catch (err) {}
});

    ws.on("close", () => {
        console.log("❌ WS Disconnected... reconnecting");
        setTimeout(startTracker, 3000);
    });

    ws.on("error", () => {});
}

/* ================== JOIN ================== */

function handleJoin(username) {
    players.set(username, Date.now());
    console.log(`👤 JOINED: ${username}`);
    updateDiscord();
}

/* ================== LEAVE DETECTION ================== */

setInterval(() => {
    const now = Date.now();

    for (const [user, time] of players) {
        if (now - time > 15000) {
            players.delete(user);
            console.log(`👋 LEFT: ${user}`);
        }
    }

    updateDiscord();
}, 5000);

/* ================== DISCORD EMBED ================== */

async function updateDiscord() {
    try {
        const channel = await client.channels.fetch(playerChannelId);

        const names = [...players.keys()];
        const shown = names.slice(0, 20);

        let list = shown.map(p => `• ${p}`).join("\n");
        if (!list) list = "No players online";

        if (names.length > 20) {
            list += `\n+ ${names.length - 20} more...`;
        }

        const embed = {
            color: 0x00ff88,
            title: "🟢 Stick Arena Live",
            description: `**Players Online:** ${players.size}\n\n${list}`,
            footer: { text: "Live updating" }
        };

        // 🔥 TRY EDIT
        if (messageRef) {
            try {
                await messageRef.edit({ embeds: [embed] });
                return;
            } catch (err) {
                // message probably deleted
                messageRef = null;
            }
        }

        // 🔥 SEND NEW MESSAGE IF NEEDED
        messageRef = await channel.send({ embeds: [embed] });

    } catch (err) {
        console.log(err);
    }
}

/* ================== READY ================== */

client.once("clientReady", () => {
    console.log("Stick Arena Bot Online");
    startTracker();
});

/* ================== CLEAN WELCOME ================== */

client.on("guildMemberAdd", async (member) => {

    try {
        await member.send(`🔥 Welcome to Stick Arena V2, ${member.user.username}!`);
    } catch {}

    try {
        const channel = await client.channels.fetch(welcomeChannelId);

        await channel.send({
            content: `👋 Everyone welcome <@${member.id}> to **Stick Arena V2!**`
        });

    } catch (err) {
        console.log(err);
    }
});

/* ================== MESSAGE ================== */

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

/* GAME BUTTON */

if(message.content === "!game"){
const button = new ButtonBuilder()
.setLabel("JOIN SAV2 NOW ⚔️")
.setStyle(ButtonStyle.Link)
.setURL("https://us.stickarena.fun/");

await message.channel.send({
content:`⚔️ SAV2\n\n🟢 Online Count ${players.size}`,
components:[new ActionRowBuilder().addComponents(button)]
});
}

/* AI */

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

try {

const res = await axios.post(
"https://api.groq.com/openai/v1/chat/completions",
{
model:"llama-3.1-8b-instant",
messages:[
{
role:"system",
content:`You are SAV2. Be casual, funny, short.`
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

const reply = res.data.choices[0].message.content;

history.push({role:"assistant",content:reply});
memory.set(userId,history);

message.reply(reply);

} catch(err) {
console.log(err);
message.reply("ngl I lagged 😭");
}

});

/* ================== EXPRESS (RENDER FIX) ================== */

const app = express();

app.get("/", (req, res) => res.send("alive"));

app.listen(process.env.PORT || 3000, () => {
    console.log("Web service active");
});

/* ================== LOGIN ================== */

client.login(process.env.TOKEN);