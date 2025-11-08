import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import DynamicMessage from "./dynamicMessage.js";
import MusicPlayer from "../MusicPlayer.js";
import HaramLeotta from "../../../index.js";
import { secondsToString } from "../../../utils/length.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import ASong from "../song/ASong.js";
import Logger from "../../logging/Logger.js";

export default class NowPlayingMessage extends DynamicMessage {

    /** Updates the content of the message displaying current playing song. */
    updateContent(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        const song: ASong | undefined = musicPlayer.getCurrent();
        if (!song) return;
        const queue: ASong[] = musicPlayer.queue;

        // Generate embed with song metadata
        const songLength: string = song.lengthSeconds ? secondsToString(song.lengthSeconds) : "???";
        const queueLength: string = secondsToString(queue.reduce((total, song) => total += song.lengthSeconds || 0, 0));

        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor(HaramLeotta.get().embedColor)
            .setTitle("Music Queue")
            .setDescription(`[${song.title}](${song.uri})`)
            .addFields({
                name: `Song duration: [\`${songLength}\`]`,
                value: `By: <@${song.requestor}>`, inline: true
            },
                {
                    name: `Queue duration: [\`${queueLength}\`]`,
                    value: `**Enqueued songs: [\`${queue.length}\`]**`, inline: true
                })

        if (song.type === ASong.SongType.YOUTUBE_MIX) {
            embed.setFooter({
                text: "This is a Youtube Mix! To skip it, use the `ham skipmix` command."
            });
        } else if (queue.length > 1) {
            embed.setFooter({
                text: `Coming up: ${queue[1].title}`,
                iconURL: queue[1].thumbnail
            });

        }
        try {
            if (song.thumbnail) embed.setImage(song.thumbnail);
        } catch (e) {
            Logger.error("Error setting thumbnail\n", e as Error);
        }

        // Generate embed reactions to be used as command shortcuts
        const anyLoop: boolean = musicPlayer.loopPolicy !== MusicPlayer.LoopPolicy.NONE;
        const songLoop: boolean = musicPlayer.loopPolicy === MusicPlayer.LoopPolicy.SONG;
        const paused: boolean = musicPlayer.player.state.status === AudioPlayerStatus.Paused;

        const component = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("loop")
                .setStyle(anyLoop ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji(songLoop ? "877873237244125214" : "877867473322541086"),  // 🔂, 🔁

            new ButtonBuilder()
                .setCustomId(`back`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994255527946") // ⏮️
                // Disable if there is no song left in cache
                .setDisabled(!musicPlayer.cache.length),

            new ButtonBuilder()
                .setCustomId(paused ? "unpause" : "pause")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(paused ? "877853994305855508" : "877853994259730453"),    // ▶️, ⏸️

            new ButtonBuilder()
                .setCustomId(`skip`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994326851634"),    // ⏭️

            new ButtonBuilder()
                .setCustomId(`clear`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994293280828") // ⏹️
        );


        return super.setContent({ embeds: [embed], components: [component] });
    }
}