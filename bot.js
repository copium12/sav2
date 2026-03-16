const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
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

const playerChannelId = "1481485311967100938";
const welcomeChannelId = "1450265385445097654";

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
        console.log(err);
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

Everything you need to get started can be found in the **links channel**.

Looking for a match? Type **@Active** in chat and players will jump in.

See you in the arena 🥊`);

}catch(err){
console.log("DM failed");
}

try{

const canvas = Canvas.createCanvas(1000,400);
const ctx = canvas.getContext("2d");

/* SERVER BANNER */

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

/* OUTPUT IMAGE */

const attachment = new AttachmentBuilder(canvas.toBuffer(),{name:"welcome.png"});

const channel = await client.channels.fetch(welcomeChannelId);

/* WAVE BUTTON */

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

/* GAME COMMAND */

client.on("messageCreate", async message=>{

if(message.author.bot) return;

if(message.content === "!game"){

const button = new ButtonBuilder()
.setLabel("JOIN SAV2 NOW ⚔️")
.setStyle(ButtonStyle.Link)
.setURL("https://stickarenav2.netlify.app/");

const row = new ActionRowBuilder().addComponents(button);

await message.channel.send({
content:`⚔️ **STICK ARENA V2**

🟢 Online Count ${viewers}`,
components:[row]
});

}

});

/* LOGIN */

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
console.log(`Tracker running on port ${PORT}`);
});