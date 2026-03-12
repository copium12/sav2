const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log("Stick Arena Bot Online");
});

client.on('messageCreate', async (message) => {

    if (message.content === "!arena") {

        const button = new ButtonBuilder()
            .setLabel("JOIN SAV2 ⚔️")
            .setStyle(ButtonStyle.Link)
            .setURL("https://stickarenav2.netlify.app")


        const row = new ActionRowBuilder().addComponents(button);

        message.channel.send({
            content: "⚔️ **Stick Arena V2**\nJoin now below!",
            components: [row]
        });

    }

});

client.login(process.env.TOKEN);