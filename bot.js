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

const players = new Map();
let messageRef = null;

/* ================== WEBSOCKET ================== */

function startTracker() {
    const ws = new WebSocket("wss://ws.stickarena.fun:1138");

    ws.on("open", () => {
        console.log("🔥 Connected to Stick Arena WS");
    });

    ws.on("message", (data) => {
    let msg;

    // handle binary packets too
    if (Buffer.isBuffer(data)) {
        msg = data.toString("utf8");
    } else {
        msg = data.toString();
    }

    console.log("RAW:", msg); // 🔥 MUST SEE THIS

    try {
        const clean = msg.replace(/#+/g, "");

        const matches = clean.match(/[a-zA-Z_]{2,16}(?=\d)/g);

        if (!matches) return;

        for (const username of matches) {
            handleJoin(username);
        }

    } catch {}
});

    ws.on("close", () => {
        console.log("❌ WS closed... reconnecting");
        setTimeout(startTracker, 3000);
    });
}

/* ================== JOIN ================== */

function handleJoin(username) {
    console.log("ADDING:", username);

    players.set(username, Date.now());

    console.log("CURRENT PLAYERS:", [...players.keys()]);

    updateDiscord();
}

/* ================== LEAVE ================== */

setInterval(() => {
    const now = Date.now();

    for (const [user, time] of players) {
        if (now - time > 15000) {
            players.delete(user);
            console.log("REMOVED:", user);
        }
    }

    updateDiscord();
}, 5000);

/* ================== DISCORD UPDATE ================== */

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

        // 🔥 TRY EDIT FIRST
        if (messageRef) {
            try {
                await messageRef.edit({ embeds: [embed] });
                return;
            } catch {
                messageRef = null;
            }
        }

        // 🔥 SEND NEW IF BROKEN
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

/* ================== WELCOME ================== */

client.on("guildMemberAdd", async (member) => {
    try {
        await member.send(`🔥 Welcome to Stick Arena V2, ${member.user.username}!`);
    } catch {}

    try {
        const channel = await client.channels.fetch(welcomeChannelId);
        await channel.send(`👋 Everyone welcome <@${member.id}> to **Stick Arena V2!**`);
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
.setURL("https://stickarenav2.netlify.app/join.html");

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
content:`Be casual, short, funny.`
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

// 🔥 LIMIT LENGTH
if (reply.length > 2000) {
    reply = reply.slice(0, 1990) + "...";
}

message.reply(reply);

} catch(err) {
console.log(err);
message.reply("ngl I lagged 😭");
}

});

/* ================== EXPRESS ================== */

const app = express();

app.get("/", (req, res) => res.send("alive"));

app.listen(process.env.PORT || 3000, () => {
    console.log("Web service active");
});

/* ================== LOGIN ================== */

client.login(process.env.TOKEN);