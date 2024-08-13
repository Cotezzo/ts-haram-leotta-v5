import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DynamicMessage } from "./dynamicMessage";
import { ASong, SongType } from "./song";
import HaramLeotta from "../..";
import { MusicPlayer } from "./musicPlayer";
import { secondsToString } from "../../utils/length";
import { LoopPolicy } from "./musicQueue";
import { AudioPlayerStatus } from "@discordjs/voice";

export class NowPlayingMessage extends DynamicMessage {
    updateContent(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        const song: ASong | undefined = musicPlayer.getCurrent();
        if(!song) return;

        // Generate embed with song metadata
        const songLength: string = song.lengthSeconds ? secondsToString(song.lengthSeconds) : "???";
        const queueLength: string = secondsToString(musicPlayer.queue.reduce((total, song) => total += song.lengthSeconds || 0, 0));

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
                value: `**Enqueued songs: [\`${queueLength}\`]**`, inline: true
            })

        if(song.thumbnail) embed.setImage(song.thumbnail);


        // Generate embed reactions to be used as command shortcuts
        const anyLoop: boolean = musicPlayer.loopPolicy !== LoopPolicy.NONE;
        const songLoop: boolean = musicPlayer.loopPolicy === LoopPolicy.SONG;
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