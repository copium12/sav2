const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const puppeteer = require("puppeteer");

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

const playerChannelId = "1481485311967100938";
const welcomeChannelId = "1450265385445097654";

/* PLAYER DATA */

let viewers = 0;
const players = new Set();
let panelMessage = null;

/* 🔥 EMBED PANEL */

async function updatePanel() {
    try {
        const channel = await client.channels.fetch(playerChannelId);

        const playerArray = [...players];
        const shown = playerArray.slice(0, 20);

        let list = shown.map(p => `• ${p}`).join("\n");

        if (players.size > 20) {
            list += `\n+ ${players.size - 20} more...`;
        }

        if (!list) list = "No players online";

        const embed = new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle("🟢 Stick Arena V2")
            .addFields(
                { name: "Players Online", value: `**${players.size}**`, inline: true },
                { name: "Live Players", value: list }
            )
            .setFooter({ text: "Updates automatically" });

        if (!panelMessage) {
            panelMessage = await channel.send({ embeds: [embed] });
        } else {
            await panelMessage.edit({ embeds: [embed] });
        }

    } catch (err) {
        console.log(err);
    }
}

/* TRACKER */

async function startTracker() {

    const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

    const page = await browser.newPage();

    page.on("console", async msg => {
        const text = msg.text();

        if (text.startsWith("U") && text.includes("########")) {

            try {
                const match = text.match(/#+([a-zA-Z0-9_]+)/);
                if (!match) return;

                const username = match[1];

                /* LEAVE */
                if (text.includes(";0;0;0;0")) {
                    if (players.has(username)) {
                        players.delete(username);
                        viewers = players.size;

                        console.log("❌ LEFT:", username);
                        updatePanel();
                    }
                    return;
                }

                /* JOIN */
                if (!players.has(username)) {
                    players.add(username);
                    viewers = players.size;

                    console.log("👤 JOINED:", username);
                    updatePanel();
                }

            } catch (e) {}
        }
    });

    await page.evaluateOnNewDocument(() => {
        const OriginalWebSocket = window.WebSocket;

        window.WebSocket = function (...args) {
            const ws = new OriginalWebSocket(...args);

            ws.addEventListener("message", (event) => {
                try {
                    if (event.data instanceof ArrayBuffer) {
                        const bytes = new Uint8Array(event.data);

                        let text = "";
                        for (let i = 0; i < bytes.length; i++) {
                            text += String.fromCharCode(bytes[i]);
                        }

                        console.log(text);
                    } else {
                        console.log(event.data);
                    }
                } catch (err) {}
            });

            return ws;
        };
    });

    await page.goto("https://us.stickarena.fun");

    console.log("🔥 Tracker running (EMBED MODE)");
}

/* READY */

client.once("clientReady", async () => {
    console.log("Stick Arena Bot Online");

    updatePanel();
    startTracker();
});

/* WELCOME */

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

const canvas = Canvas.createCanvas(1000,400);
const ctx = canvas.getContext("2d");

let bannerURL = member.guild.bannerURL({extension:"png",size:1024});
if(!bannerURL) bannerURL = "https://i.imgur.com/0j0Z8FZ.png";

const banner = await Canvas.loadImage(bannerURL);
ctx.drawImage(banner,0,0,1000,400);

const gradient = ctx.createLinearGradient(0,0,1000,0);
gradient.addColorStop(0,"rgba(0,0,0,0.7)");
gradient.addColorStop(1,"rgba(0,0,0,0.2)");
ctx.fillStyle = gradient;
ctx.fillRect(0,0,1000,400);

ctx.fillStyle="#fff";
ctx.font="bold 55px sans-serif";
ctx.fillText(member.user.username,350,200);

ctx.font="30px sans-serif";
ctx.fillText(`Member #${member.guild.memberCount}`,350,250);

const avatar = await Canvas.loadImage(member.user.displayAvatarURL({extension:"png"}));
ctx.save();
ctx.beginPath();
ctx.arc(170,200,120,0,Math.PI*2);
ctx.clip();
ctx.drawImage(avatar,50,80,240,240);
ctx.restore();

ctx.beginPath();
ctx.arc(170,200,130,0,Math.PI*2);
ctx.lineWidth = 8;
ctx.strokeStyle = "#00ff88";
ctx.shadowColor = "#00ff88";
ctx.shadowBlur = 25;
ctx.stroke();

ctx.shadowBlur = 35;
ctx.strokeStyle = "#00ff88";
ctx.lineWidth = 6;
ctx.strokeRect(5,5,990,390);

const attachment = new AttachmentBuilder(canvas.toBuffer(),{name:"welcome.png"});

const channel = await client.channels.fetch(welcomeChannelId);

const waveButton = new ButtonBuilder()
.setCustomId(`wave_${member.id}`)
.setLabel("👋 Wave to say hi")
.setStyle(ButtonStyle.Success);

await channel.send({
content:`👋 Everyone welcome <@${member.id}> to **Stick Arena V2!**`,
files:[attachment],
components:[new ActionRowBuilder().addComponents(waveButton)]
});

} catch(err) {
console.log(err);
}

});

/* BUTTON */

client.on("interactionCreate", async interaction => {
if(!interaction.isButton()) return;
if(interaction.customId.startsWith("wave_")){
await interaction.reply({content:`👋 ${interaction.user} waved hello!`});
}
});

/* MESSAGE HANDLER */

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

/* GAME */

if(message.content === "!game"){
const button = new ButtonBuilder()
.setLabel("JOIN SAV2 NOW ⚔️")
.setStyle(ButtonStyle.Link)
.setURL("https://us.stickarena.fun/");

await message.channel.send({
content:`⚔️ **SAV2**

🟢 Online Count ${players.size}`,
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

const vibes = [
"be funny and slightly sarcastic",
"be chill and helpful",
"be casual and short",
"be playful and a little toxic but not offensive"
];

const vibe = vibes[Math.floor(Math.random()*vibes.length)];

try {

const res = await axios.post(
"https://api.groq.com/openai/v1/chat/completions",
{
model:"llama-3.1-8b-instant",
messages:[
{
role:"system",
content:`
You are SAV2, a real Discord user.

${vibe}.

Talk naturally like a real person.
Use slang casually.
Keep responses short.
Do NOT sound like an AI.
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

const reply = res.data.choices[0].message.content;

history.push({role:"assistant",content:reply});
memory.set(userId,history);

message.reply(reply);

} catch(err) {
console.log(err);
message.reply("ngl I lagged 😭");
}

});

/* LOGIN */

client.login(process.env.TOKEN);