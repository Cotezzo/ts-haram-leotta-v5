import { PermissionsBitField, VoiceBasedChannel, VoiceChannel, VoiceState } from "discord.js";
import Context from "../classes/logging/Context.js";
import Logger from "../classes/logging/Logger.js";
import HaramLeotta from "../index.js";
import MusicPlayer from "../classes/music/MusicPlayer.js";

export default function (oldState: VoiceState, newState: VoiceState): void {
    // Before executing any logic, initialize context for verbose logging
    Context.initialize({ userId: oldState.member?.user.username || undefined, serverId: oldState.guild.id, commandId: "voiceStateUpdate" },
        () => onVoiceStateUpdate(oldState, newState));
}

async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    Logger.trace(`oldState: ${JSON.stringify(oldState)}`);
    Logger.trace(`newState: ${JSON.stringify(newState)}`);

    // Only watch for bot's voice activity
    if(oldState.id !== HaramLeotta.get().user?.id) return;
    Logger.info(`${oldState.channelId} => ${newState.channelId}`);

    // Retrieve musicPlayer and execute logic safely (with locks)
    const groupId = oldState.guild.id;
    await MusicPlayer.locking(groupId, async () => {
        // Retrieve current musicPlayer from cache (if any)
        let musicPlayer: MusicPlayer | undefined = MusicPlayer.cache.get(groupId);
        if (!musicPlayer) return;

        // If newState channel is empty (bot's left) or bot has no voice
        // permissions on the new channel, destroy music player.
        if(!newState.channel || !MusicPlayer.checkVoiceChannelPermissions(newState.channel)) {
            return await musicPlayer.destroy();
        }
        
        // If the bot is in a new valid channel, replace channel
        if(musicPlayer.voiceChannel.id && newState.channelId !== musicPlayer.voiceChannel.id) {
            musicPlayer.voiceChannel = newState.channel;
            Logger.info("MusicPlayer voiceChannel updated");
        }

    }, "onVoiceStateUpdate");
}