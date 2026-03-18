const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
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

const playerChannelId = "1481485311967100938";
const welcomeChannelId = "1450265385445097654";

app.use(express.json());

/* PLAYER COUNT */

async function updatePlayerChannel() {
    try {
        const channel = await client.channels.fetch(playerChannelId);
        const newName = `🟢┃𝙊𝙉𝙇𝙄𝙉𝙀 𝘾𝙊𝙐𝙉𝙏 ${viewers}`;
        if (channel.name !== newName) {
            await channel.setName(newName);
        }
    } catch (err) {
        console.log(err);
    }
}

/* TRACKER */

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

/* READY */

client.once("clientReady",()=>{
    console.log("Stick Arena Bot Online");
    updatePlayerChannel();
});

/* WELCOME */

client.on("guildMemberAdd", async (member)=>{

try{

await member.send(`🔥 **Welcome to Stick Arena V2, ${member.user.username}!** ⚔️

You're now part of the community!

📎 Everything you need can be found here:
https://discord.com/channels/1032830761314832444/1478084954796593152

🎮 Want to play?
Just type **@Active** in chat and players will jump in.

See you in the arena 🥊`);

}catch{}

try{

const canvas = Canvas.createCanvas(1000,400);
const ctx = canvas.getContext("2d");

let bannerURL = member.guild.bannerURL({extension:"png",size:1024});
if(!bannerURL) bannerURL = "https://i.imgur.com/0j0Z8FZ.png";

const banner = await Canvas.loadImage(bannerURL);
ctx.drawImage(banner,0,0,1000,400);

/* gradient */
const gradient = ctx.createLinearGradient(0,0,1000,0);
gradient.addColorStop(0,"rgba(0,0,0,0.7)");
gradient.addColorStop(1,"rgba(0,0,0,0.2)");
ctx.fillStyle = gradient;
ctx.fillRect(0,0,1000,400);

/* username */
ctx.fillStyle="#fff";
ctx.font="bold 55px sans-serif";
ctx.fillText(member.user.username,350,200);

/* member count */
ctx.font="30px sans-serif";
ctx.fillText(`Member #${member.guild.memberCount}`,350,250);

/* avatar */
const avatar = await Canvas.loadImage(member.user.displayAvatarURL({extension:"png"}));
ctx.save();
ctx.beginPath();
ctx.arc(170,200,120,0,Math.PI*2);
ctx.clip();
ctx.drawImage(avatar,50,80,240,240);
ctx.restore();

/* glow */
ctx.beginPath();
ctx.arc(170,200,130,0,Math.PI*2);
ctx.lineWidth = 8;
ctx.strokeStyle = "#00ff88";
ctx.shadowColor = "#00ff88";
ctx.shadowBlur = 25;
ctx.stroke();

/* border */
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

}catch(err){
console.log(err);
}

});

/* BUTTON */

client.on("interactionCreate", async interaction=>{
if(!interaction.isButton()) return;
if(interaction.customId.startsWith("wave_")){
await interaction.reply({content:`👋 ${interaction.user} waved hello!`});
}
});

/* MESSAGE HANDLER */

client.on("messageCreate", async (message)=>{

if(message.author.bot) return;

/* GAME */

if(message.content === "!game"){
const button = new ButtonBuilder()
.setLabel("JOIN SAV2 NOW ⚔️")
.setStyle(ButtonStyle.Link)
.setURL("https://stickarenav2.netlify.app/join.html");

await message.channel.send({
content:`⚔️ **SAV2**

🟢 Online Count ${viewers}`,
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

try{

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

}catch(err){
console.log(err);
message.reply("ngl I lagged 😭");
}

});

/* LOGIN */

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Tracker running on ${PORT}`));