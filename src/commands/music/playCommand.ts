import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate";
import { CommandMetadata } from "../types";
import { Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer";
import ASong from "../../classes/music/song/ASong";
import QueryMessage from "../../classes/music/message/queryMessage";

/** Dumb regex that checks if the string is an URL (not if it's a valid one). */
const uriRegex: RegExp = /https?:\/\/.*/;

const playCommandMetadata: CommandMetadata<{ msg: Message, uri?: string, query?: string }, void> = {
    category: "Music", description: "Plays a song in your voice channel, loading \
    the url (if supported) or searching on YouTube.\nSupported  websites are Youtube and Spotify (also, direct resources URLs such as MP3). ",
    aliases: ["play", "p"], usage: "`ham play https://www.youtube.com/watch?v=4dL1XSPC9FI` // Plays the youtube video on the voice channel\n\
    `ham play https://www.youtube.com/playlist?list=PLBO2h-GzDvIbGg18a-22GCHDHrdAVZ1SL` // Adds to the queue all the videos in the Youtube playlist\n\
    `ham play https://open.spotify.com/track/6d42nB4qWqL8QJUUZjt640` // Plays the youtube video of the provided Spotify song\n\
    `ham play https://open.spotify.com/album/2dyvMAiHbNpIiQzMbjrVPf` // Adds to the queue all the songs in the Spotify album\n\
    `ham play https://open.spotify.com/playlist/04AaSp8yroBYFelEom9RtB` // Adds to the queue all the songs in the Spotify playlist\n\
    `ham play emre song` // A message with query results will be sent in the channel for you to choose from.",

    command: async ({ msg, uri, query }) => {

        // If user wants to play from URL, check for the website format first
        let songs: ASong[] | undefined = undefined;

        // Determine url type and retrieve song - if url is invalid, throw error
        if (uri) {
            songs = await MusicPlayer.getSong(uri);

            songs.forEach(s => s.requestor = msg.member?.id)

            // If the url is valid, add to MusicPlayer queue and play
            await MusicPlayer.get(msg, async (musicPlayer: MusicPlayer) => {
                await musicPlayer.add(...songs!);
            });
        }

        // If input is a query, start youtube search
        //! If another queryMessage was present, it is removed
        else if(query) {
            await QueryMessage.get(msg, async (queryMessage) => {
                await queryMessage.updateContent();
                await queryMessage.send();
            }, query);
        }
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            if (!args.length)
                throw new Error("No song specified");
    
            // Check if the user typed a URL or a simple text query
            let uri = undefined, query = undefined;
            if (uriRegex.test(args[0])) uri = args[0];
            else query = args.join(" ");
    
            return { msg, uri, query };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    }

    // TODO: slash command handler
}
export default playCommandMetadata;