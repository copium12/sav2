const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const WebSocket = require("ws");
const express = require("express");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const playerChannelId = "1481485311967100938";

let players = new Set();
let lastMessage = null;

/* =========================
   🔥 TRACKER
========================= */

function startTracker() {
    const ws = new WebSocket("wss://ws.stickarena.fun:1138");

    ws.on("open", () => {
        console.log("🔥 Connected to Stick Arena");

        const id = Date.now();

        ws.send("08");

        ws.send(`A1kf########ai${id};135;995;8;2006;1;999999;0;974218;2`);

        setTimeout(() => {
            ws.send("01_0;");
            ws.send("C1kf");
            ws.send(`U1kf########ai${id};135;995;8;2006;1;2`);
        }, 500);
    });

    ws.on("message", (data) => {
        const msg = data.toString();

        // 👇 PLAYER JOIN DETECTION
        if (msg.includes("U1rc")) {
            const match = msg.match(/########(.*?)\d+;/);
            if (match) {
                const username = match[1];

                if (!players.has(username)) {
                    players.add(username);
                    console.log("➕", username);
                    updateDiscord();
                }
            }
        }

        // 👇 RESET PLAYERS (new lobby packet)
        if (msg.startsWith("0c")) {
            players.clear();
            console.log("🔄 Reset players");
            updateDiscord();
        }
    });

    ws.on("close", () => {
        console.log("❌ Reconnecting...");
        setTimeout(startTracker, 2000);
    });
}

/* =========================
   📡 DISCORD UPDATE
========================= */

async function updateDiscord() {
    try {
        const channel = await client.channels.fetch(playerChannelId);

        const list = [...players];
        const display = list.length > 0
            ? list.slice(0, 20).join("\n") + (list.length > 20 ? `\n+${list.length - 20} more` : "")
            : "No players online";

        const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle("🟢 Stick Arena Live")
            .setDescription(`**Players Online: ${list.length}**\n\n${display}`)
            .setFooter({ text: "Live updating" })
            .setTimestamp();

        if (!lastMessage) {
            lastMessage = await channel.send({ embeds: [embed] });
        } else {
            await lastMessage.edit({ embeds: [embed] });
        }

    } catch (err) {
        console.log("Discord update error:", err.message);
    }
}

/* =========================
   🤖 READY
========================= */

client.once("ready", () => {
    console.log("✅ Bot Online");
    startTracker();
});

/* =========================
   🌐 KEEP RENDER ALIVE
========================= */

const app = express();
app.get("/", (req, res) => res.send("alive"));
app.listen(process.env.PORT || 3000);

/* =========================
   🔑 LOGIN
========================= */

client.login(process.env.TOKEN);