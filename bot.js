const { 
    Client, 
    GatewayIntentBits, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    AttachmentBuilder 
} = require('discord.js');

const axios = require('axios');
const WebSocket = require("ws");
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

        // 🔑 LOGIN / PLAYER DATA PACKETS
        if (msg.startsWith("U1") || msg.startsWith("U1rc")) {
            try {
                const match = msg.match(/([a-zA-Z0-9_]+)/g);
                if (!match) return;

                // last readable string = username
                const username = match[match.length - 1];

                if (username && username.length < 20) {
                    handleJoin(username);
                }

            } catch {}
        }
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
        const display = names.slice(0, 20).join("\n") || "No players online";

        const embed = {
            color: 0x00ff88,
            title: "🟢 Stick Arena Live",
            description: `**Players Online:** ${players.size}\n\n${display}`,
            footer: {
                text: names.length > 20 ? `+${names.length - 20} more...` : "Live updating"
            }
        };

        if (!messageRef) {
            messageRef = await channel.send({ embeds: [embed] });
        } else {
            await messageRef.edit({ embeds: [embed] });
        }

    } catch (err) {
        console.log(err);
    }
}

/* ================== READY ================== */

client.once("clientReady", () => {
    console.log("Stick Arena Bot Online");
    startTracker();
});

/* ================== WELCOME ================== */

client.on("guildMemberAdd", async (member) => {

try {

await member.send(`🔥 **Welcome to Stick Arena V2, ${member.user.username}!** ⚔️

You're now part of the community!

📎 https://discord.com/channels/1032830761314832444/1478084954796593152

See you in the arena 🥊`);

} catch {}

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