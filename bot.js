const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const WebSocket = require('ws');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const memory = new Map();
const cooldown = new Map();

const playerChannelId = "1481485311967100938";

/* PLAYER DATA */

const players = new Set();
let panelMessage = null;

/* 🔥 PANEL */

async function updatePanel() {
    const channel = await client.channels.fetch(playerChannelId);

    const listArr = [...players];
    const shown = listArr.slice(0, 20);

    let list = shown.map(p => `• ${p}`).join("\n");

    if (players.size > 20) {
        list += `\n+ ${players.size - 20} more...`;
    }

    if (!list) list = "No players online";

    const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🟢 Stick Arena Live")
        .addFields(
            { name: "Players Online", value: `**${players.size}**`, inline: true },
            { name: "Live Players", value: list }
        );

    if (!panelMessage) {
        panelMessage = await channel.send({ embeds: [embed] });
    } else {
        await panelMessage.edit({ embeds: [embed] });
    }
}

/* 🔥 WEBSOCKET TRACKER */

function startTracker() {

    const ws = new WebSocket("wss://ws.stickarena.fun:1138");

    ws.on("open", () => {
        console.log("🔥 Connected to Stick Arena WS");
    });

    ws.on("message", (data) => {

        try {
            const text = data.toString();

            // 🔥 JOIN / UPDATE
            if (text.startsWith("U") && text.includes("########")) {

                const match = text.match(/#+([a-zA-Z0-9_]+)/);
                if (!match) return;

                const username = match[1];

                // 🔥 LEAVE DETECTION
                if (text.includes(";0;0;0;0")) {
                    if (players.has(username)) {
                        players.delete(username);
                        console.log("❌ LEFT:", username);
                        updatePanel();
                    }
                    return;
                }

                // 🔥 JOIN
                if (!players.has(username)) {
                    players.add(username);
                    console.log("👤 JOINED:", username);
                    updatePanel();
                }
            }

        } catch (err) {}
    });

    ws.on("close", () => {
        console.log("⚠️ WS disconnected, reconnecting...");
        setTimeout(startTracker, 3000);
    });

    ws.on("error", (err) => {
        console.log("WS Error:", err.message);
    });
}

/* READY */

client.once("clientReady", async () => {
    console.log("Stick Arena Bot Online");

    updatePanel();
    startTracker();
});

/* MESSAGE */

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content === "!game") {
        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 NOW ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app/join.html");

        await message.channel.send({
            content: `⚔️ **SAV2**\n\n🟢 Online Count ${players.size}`,
            components: [new ActionRowBuilder().addComponents(button)]
        });
    }

    if (!message.mentions.has(client.user)) return;

    const clean = message.content.replace(`<@${client.user.id}>`, "").trim();
    const userId = message.author.id;

    if (cooldown.get(userId) > Date.now()) {
        return message.reply("⏳ chill bro");
    }

    cooldown.set(userId, Date.now() + 4000);

    await message.channel.sendTyping();

    if (!memory.has(userId)) memory.set(userId, []);
    const history = memory.get(userId);

    history.push({ role: "user", content: clean });
    if (history.length > 6) history.shift();

    try {
        const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are SAV2, a chill funny Discord user."
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

        const reply = res.data.choices[0].message.content;

        history.push({ role: "assistant", content: reply });
        memory.set(userId, history);

        message.reply(reply);

    } catch (err) {
        console.log(err);
        message.reply("ngl I lagged 😭");
    }
});

/* LOGIN */

client.login(process.env.TOKEN);