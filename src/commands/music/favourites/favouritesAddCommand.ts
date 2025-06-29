import { CommandMetadata } from "../../types";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage";
import MusicPlayer from "../../../classes/music/MusicPlayer";
import UserRepository from "../../../classes/user/UserRepository";
import YoutubeSong from "../../../classes/music/song/youtube/YoutubeSong";
import YoutubeMixSong from "../../../classes/music/song/youtube/YoutubeMixSong";
import YoutubePlaylistSong from "../../../classes/music/song/youtube/YoutubePlaylistSong";
import SpotifySong from "../../../classes/music/song/spotify/SpotifySong";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../../events/onInteractionCreate";

const favouritesAddCommandMetadata: CommandMetadata<{ i: Message | Interaction, userId: string }, void> = {
    category: "Music", description: "Adds current song to favourites. \
Playlists/Mixes can't be added: current song will be added instead.",
    aliases: ["favouritesadd", "favadd", "fa"],
    usage: "`ham favouritesadd`\n`ham favadd`\n`ham fa`",

    command: async ({ i, userId }) => {
        let song: SpotifySong | YoutubeSong | YoutubeMixSong | YoutubePlaylistSong | undefined;
        await MusicPlayer.get(i, musicPlayer => {
            // Retrieve currently playing song (if any)
            song = musicPlayer.getCurrent();
        })

        if(song) {
            // If the current song is a Mix, retrieve the actual inner song
            if(song instanceof YoutubeMixSong) song = song.getCurrent();

            //! MusicPlayer queue should not contain Playlist song instance
            if(song instanceof YoutubePlaylistSong)
                throw new Error("Invalid song");
            
            // Add the SpotifySong | YoutubeSong to the favourites for the user
            await UserRepository.addUserFavourite(userId, song);

            // If there is a favouriteMessage instance, update its content
            await FavouritesMessage.get(i, async (favouritesMessage) => {
                if(favouritesMessage) {
                    await favouritesMessage.updateQueue();
                    await favouritesMessage.updateContent().update();
                }
            });
        }
    },

    onMessage: {
        requestTransformer: (msg, _content, _args) => {
            const userId = msg.member?.id;
            if(!userId) throw new Error("No userId found");
            return { i: msg, userId };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            const userId = interaction.user.id;
            return { i: interaction, userId };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default favouritesAddCommandMetadata;