const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
require('dotenv').config();

const config = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  channelId: process.env.CHANNEL_ID,
  discordToken: process.env.DISCORD_TOKEN,
  discordChannelVideos: process.env.DISCORD_CHANNEL_VIDEOS,
  discordChannelLives: process.env.DISCORD_CHANNEL_LIVES,
  checkInterval: 300000
};

const youtube = google.youtube({
  version: 'v3',
  auth: config.youtubeApiKey
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastActivityId = null;

async function checkActivities() {
  try {
    console.log('[YouTube] Checando atividades...');

    const response = await youtube.activities.list({
      channelId: config.channelId,
      part: 'snippet,contentDetails',
      maxResults: 1
    });

    const activities = response.data.items;
    if (!activities || activities.length === 0) {
      console.log('[YouTube] Nenhuma atividade encontrada.');
      return;
    }

    const activity = activities[0];
    const activityId = activity.id;
    const snippet = activity.snippet;
    const type = snippet.type;

    if (activityId === lastActivityId) {
      console.log('[YouTube] Nenhuma atividade nova.');
      return;
    }

    lastActivityId = activityId;

    let embed;
    let link;

    if (type === 'upload') {
      const videoId = activity.contentDetails.upload.videoId;
      link = `https://www.youtube.com/watch?v=${videoId}`;

      embed = new EmbedBuilder()
        .setTitle(`🎬 Novo vídeo publicado!`)
        .setDescription(`**${snippet.title}**\n[Assista agora](${link})`)
        .setColor(0xff0000)
        .setThumbnail(snippet.thumbnails.default.url)
        .setTimestamp(new Date(snippet.publishedAt));

      const channel = await client.channels.fetch(config.discordChannelVideos);
      await channel.send({ embeds: [embed] });

      console.log(`[Discord] Notificação de vídeo enviada: ${snippet.title}`);

    } else if (type === 'liveStream') {
      const videoId = activity.contentDetails.liveStream.videoId;
      link = `https://www.youtube.com/watch?v=${videoId}`;

      embed = new EmbedBuilder()
        .setTitle(`🔴 Live iniciada!`)
        .setDescription(`**${snippet.title}**\n[Assista ao vivo](${link})`)
        .setColor(0xdb0000)
        .setThumbnail(snippet.thumbnails.default.url)
        .setTimestamp(new Date(snippet.publishedAt));

      const channel = await client.channels.fetch(config.discordChannelLives);
      await channel.send({ embeds: [embed] });

      console.log(`[Discord] Notificação de live enviada: ${snippet.title}`);
    } else {
      console.log(`[YouTube] Tipo de atividade não monitorado: ${type}`);
    }

  } catch (error) {
    console.error('[YouTube] Erro ao checar atividades:', error);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  checkActivities();
  setInterval(checkActivities, config.checkInterval);
});

client.login(config.discordToken);