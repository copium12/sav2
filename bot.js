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

/* ROLE THAT CAN TRAIN AI */
const knowledgeRoleId = "1032830761314832448";

/* CHANNELS */
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

/* PLAYER TRACKING */

app.post("/join",(req,res)=>{
    viewers++;
    updatePlayerChannel();
    res.sendStatus(200);
});

app.post("/leave",(req,res)=>{
    viewers = Math.max(0, viewers - 1);
    updatePlayerChannel();
    res.sendStatus(200);
});

/* BOT READY */

client.once("clientReady",()=>{

    console.log("Stick Arena Bot Online");
    updatePlayerChannel();

});

/* WELCOME SYSTEM */

client.on("guildMemberAdd", async (member)=>{

try{

await member.send(`🔥 **Welcome to Stick Arena V2, ${member.user.username}!** ⚔️

You're now part of the community!

Everything you need can be found in the **links channel**.

Looking for a match? Type **@Active** in chat.

See you in the arena 🥊`);

}catch(err){
console.log("DM failed");
}

try{

const canvas = Canvas.createCanvas(1000,400);
const ctx = canvas.getContext("2d");

let bannerURL = member.guild.bannerURL({extension:"png",size:1024});

if(!bannerURL){
bannerURL = "https://i.imgur.com/0j0Z8FZ.png";
}

const banner = await Canvas.loadImage(bannerURL);

ctx.drawImage(banner,0,0,canvas.width,canvas.height);

/* DARK GRADIENT */

const gradient = ctx.createLinearGradient(0,0,1000,0);
gradient.addColorStop(0,"rgba(0,0,0,0.7)");
gradient.addColorStop(1,"rgba(0,0,0,0.2)");

ctx.fillStyle = gradient;
ctx.fillRect(0,0,canvas.width,canvas.height);

/* PARTICLES */

for(let i=0;i<25;i++){

ctx.fillStyle = "rgba(0,255,150,0.15)";
ctx.beginPath();
ctx.arc(Math.random()*1000,Math.random()*400,2,0,Math.PI*2);
ctx.fill();

}

/* USERNAME */

ctx.fillStyle="#ffffff";
ctx.font="bold 55px sans-serif";
ctx.fillText(member.user.username,350,200);

/* MEMBER COUNT */

ctx.font="30px sans-serif";
ctx.fillText(`Member #${member.guild.memberCount}`,350,250);

/* AVATAR */

const avatar = await Canvas.loadImage(member.user.displayAvatarURL({extension:"png"}));

ctx.save();

ctx.beginPath();
ctx.arc(170,200,120,0,Math.PI*2,true);
ctx.closePath();
ctx.clip();

ctx.drawImage(avatar,50,80,240,240);

ctx.restore();

/* AVATAR GLOW */

ctx.beginPath();
ctx.arc(170,200,130,0,Math.PI*2);
ctx.lineWidth = 8;
ctx.strokeStyle = "#00ff88";
ctx.shadowColor = "#00ff88";
ctx.shadowBlur = 25;
ctx.stroke();

/* NEON BORDER */

ctx.shadowBlur = 35;
ctx.shadowColor = "#00ff88";
ctx.strokeStyle = "#00ff88";
ctx.lineWidth = 6;

ctx.strokeRect(5,5,990,390);

const attachment = new AttachmentBuilder(canvas.toBuffer(),{name:"welcome.png"});

const channel = await client.channels.fetch(welcomeChannelId);

const waveButton = new ButtonBuilder()
.setCustomId(`wave_${member.id}`)
.setLabel("👋 Wave to say hi")
.setStyle(ButtonStyle.Success);

const row = new ActionRowBuilder().addComponents(waveButton);

await channel.send({
content:`👋 Everyone welcome **${member.user.username}** to the server!`,
files:[attachment],
components:[row]
});

}catch(err){

console.log(err);

}

});

/* WAVE BUTTON */

client.on("interactionCreate", async interaction=>{

if(!interaction.isButton()) return;

if(interaction.customId.startsWith("wave_")){

await interaction.reply({
content:`👋 ${interaction.user} waved hello!`
});

}

});

/* MESSAGE HANDLER */

client.on('messageCreate', async (message) => {

if (message.author.bot) return;

const learnText = message.content.toLowerCase();

/* LEARN FROM TRAINER ROLE */

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
Being toxic every day or starting drama isn’t.

Don’t bring outside beef here.

If staff says chill, chill.
`);
}

/* PLAY LINK */

if (
cleanMessage.includes("play") ||
cleanMessage.includes("join") ||
cleanMessage.includes("where")
) {
return message.reply(`
Play Stick Arena here:

https://us.stickarena.fun/
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

/* KNOWLEDGE SEARCH */

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
You are SAV2, assistant for the Stick Arena V2 Discord.

Speak casually like a community member.

Relevant knowledge:
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

console.log("AI ERROR:", err.message);
message.reply("⚠️ AI bugged out for a second.");

}

});

/* LOGIN */

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Tracker running on port ${PORT}`);
});