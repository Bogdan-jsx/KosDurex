const { Client, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
let config = require("./config.json");
const fs = require("fs");

const timers = {};

const client = new Client({ intents: [GatewayIntentBits.Guilds,  GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on(Events.MessageCreate, async (message) => {

  let {content, author, guildId} = message;

  if (content[0] !== "!") return;
  if (config[guildId]?.targetUsers && config[guildId]?.targetUsers.indexOf(author.id) !== -1) return;

  content = content.split(" ");

  if (!config[guildId]) config[guildId] = {};

  switch (content[0]) {
    case "!settime": // Set time in minutes after which a user will be kicked from voice channel
      config[guildId].kickTimeMins = content[1];
      fs.writeFileSync("./config.json", JSON.stringify(config));
      break;
    case "!setchannel": // Set channel for sending messages from bot
      config[guildId].messagesChannelId = content[1];
      fs.writeFileSync("./config.json", JSON.stringify(config));
      break;
    case "!adduserid":
      if (!config[guildId]?.targetUsers) config[guildId].targetUsers = [];
      config[guildId].targetUsers.push(content[1]);
      fs.writeFileSync("./config.json", JSON.stringify(config));
      break;
    case "!removeuserid":
      if (!config[guildId]?.targetUsers) break;
      const index = config[guildId].targetUsers.indexOf(content[1]);
      if (index === -1) {
        await message.reply("No such target user");
        break;
      }
      config[guildId].targetUsers.splice(index, 1);
      fs.writeFileSync("./config.json", JSON.stringify(config));
      break;
    default:
      await message.reply("Unknown command");
      break;
  }

})

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {

  const {channelId, selfDeaf, id} = newState;

  if (channelId === null && timers[id]) {
    clearTimeout(timers[id]);
    return;
  }

  if (selfDeaf === false && timers[id]) {
    clearTimeout(timers[id]);
    return;
  }

  if (
      selfDeaf === true
      && config[newState.guild.id]?.targetUsers
      && config[newState.guild.id]?.targetUsers?.indexOf(id) !== -1
  ) {

    try {

      if (timers[id]) {
        clearTimeout(timers[id]);
      }

      if (!config[newState.guild.id]?.kickTimeMins) {

        config[newState.guild.id] = {};
        config[newState.guild.id].kickTimeMins = 5;
        fs.writeFileSync("./config.json", JSON.stringify(config));

      }

      timers[newState.id] = setTimeout(async () => {

        await newState.member.voice.disconnect();
        // const messageChannelId = config[newState.guild.id]?.messagesChannelId;
        // if (messageChannelId) {
        //   const channel = await client.channels.fetch(config[newState.guild.id].messagesChannelId);
        //   await channel.send(`<@${newState.member.id}> котакбас`);
        // }

      }, 1000 * 60 * config[newState.guild.id].kickTimeMins);

    } catch (err) {

      console.log("Error:", err);

    }

  }

})

client.login(process.env.TOKEN);