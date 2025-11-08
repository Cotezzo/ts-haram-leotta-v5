import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import QueryMessage from "../../../classes/music/message/queryMessage.js";
import ASong from "../../../classes/music/song/ASong.js";
import YoutubePlaylistSong from "../../../classes/music/song/youtube/YoutubePlaylistSong.js";
import MusicPlayer from "../../../classes/music/MusicPlayer.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate.js";
import Logger from "../../../classes/logging/Logger.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const querySelectCommandMetadata: CommandMetadata<{ i: Message | Interaction, index: number | undefined }, true | void> = {
    category: "Music", description: "When the query message is displayed, select the item to be played",
    aliases: ["query-select"],
    hidden: true,

    command: async ({ i, index }) => {
        // If the message didn't contain an index, don't do anything
        // Do not throw errors since this command is called for any message
        if(!index) return;
        
        // Try to retrieve current queryMessage (if any) with Youtube results.
        // If there is no queryMessage, the callback is not called.
        return await QueryMessage.get(i, async (queryMessage: QueryMessage) => {
            Logger.info(`Received index ${index}`);

            // Retrieve song at the selected index
            const song: ASong | undefined = queryMessage.getSong(index - 1);

            // If index is invalid, do nothing
            if (!song) return;

            // If the queried song is a playlist, convert it to song array
            const songs: ASong[] = song.type === ASong.SongType.YOUTUBE_PLAYLIST
                ? await YoutubePlaylistSong.getSongs(song.id)
                : [song];

            // Add user's id to song(s) metadata
            songs.forEach(s => s.requestor = i.member?.user.id)

            // Retrieve current instance of musicPlayer (or create it and
            // add song(s) to the queue 
            await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
                await musicPlayer.add(...songs);
            });

            // Delete queryMessage after adding the song to the player
            await queryMessage.destroy();

            // If a song has been correctly added to the queue, return true
            return true;
        });
    },

    onMessage: {
        requestTransformer: (msg, content, _args) => {
            // If the message content is not a number, pass undefined so that
            // the inner command returns without doing anything
            let index: number | undefined = parseInt(content);
            if (isNaN(index) || index <= 0) index = undefined

            return { i: msg, index };
        },
        responseTransformer: (msg, added) => {
            // If a song has been added to the queue, let the user know
            if(added) msgReactResponseTransformer(msg);
        },
        errorHandler: msgReactErrorHandler
    },

    onSelect: {
        requestTransformer: (interaction) => {
            let index: number | undefined = parseInt(interaction.values[0]);
            if (isNaN(index) || index <= 0)
                throw new Error("Invalid index provided");

            return { i: interaction, index };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    }
}
export default querySelectCommandMetadata;