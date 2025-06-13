import { CommandMetadata } from "../../types";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage";
import MusicPlayer from "../../../classes/music/MusicPlayer";
import UserRepository from "../../../classes/user/UserRepository";
import ASong from "../../../classes/music/song/ASong";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate";

const favouritesPlayCommandMetadata: CommandMetadata<{ i: Message | Interaction, userId: string, index: number | undefined }, void> = {
    category: "Music", description: "Plays the selected song from the favourites.",
    aliases: ["favouritesplay", "favplay", "fp"],
    usage: "`ham fp` // Adds all your favourite songs to the queue\n\
    `ham fp 3` // Adds the selected song to the queue",

    command: async ({ i, userId, index }) => {
        if(index !== undefined) {
            let song: ASong | undefined;

            // If there is a FavouritesMessage instance, retrieve the fav from there
            await FavouritesMessage.get(i, async (favouritesMessage) => {
                song = favouritesMessage?.queue[index];
            });

            // If not, retrieve it from the database
            if(!song) song = await UserRepository.getUserFavourite(userId, index);

            // If the index is too high or the user has no favourite songs, return
            if(!song) throw new Error("No songs found");

            // Add the retrieved song to the queue
            song.requestor = userId;
            await MusicPlayer.get(i, async (musicPlayer) => {
                await musicPlayer.add(song as ASong);
            });
        } else {
            const songs = await UserRepository.getUserFavourites(userId);
            if(songs) {
                songs.forEach(s => s.requestor = userId);
                await MusicPlayer.get(i, async (musicPlayer) => {
                    await musicPlayer.add(...songs);
                });
            }
        }
    },
    
    onMessage: {
        requestTransformer: (msg, _content, args) => {
            const userId = msg.member?.id;
            if(!userId) throw new Error("No userId found");
    
            // Retrieve index to be removed - if argument is not a number, return
            let index: string | number | undefined = args.pop();
            if(index !== undefined) {
                index = parseInt(index);
                if(isNaN(index) || index < 1) throw new Error("Invalid index");
                index = --index;
            }
    
            return { i: msg, userId, index };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    }

    // TODO: slash command handler
}
export default favouritesPlayCommandMetadata;