import { getSimpleMessageCallback } from "../../events/onMessageCreate";
import { CommandMetadata } from "../../types/types";
import ClassLogger from "../../utils/logger";
import { Message } from "discord.js";
import { MusicPlayer, getSong } from "../../services/music/musicPlayer";
import { ASong} from "../../services/music/song";

const logger: ClassLogger = new ClassLogger("play");

/** Dumb regex that checks if the string is an URL (not if it's a valid one). */
const uriRegex: RegExp = /https?:\/\/.*/;

/** Define command metadata and handler methods for text and slash commands. */
const playCommandMetadata: CommandMetadata<{ msg: Message, uri?: string, query?: string }, { content: string }> = {
    // Command metadata for "help" command and general info about the command
    category: "Music", description: "Plays a song in your voice channel, loading \
    the url (if supported) or searching on YouTube.\nCurrently, the supported \
    websites are Youtbe and Spotify (also, direct resources URLs such as MP3); \
    SoundCloud support is coming soon.",
    aliases: ["play", "p"], usage: "TODO",
    
    // Actual core command with business logic implementation
    command: async ({ msg, uri, query }, callback) => {
        
        // If user wants to play from URL, check for the website format first
        let song: ASong | undefined = undefined;

        // Determine url type and retrieve song - if url is invalid, throw error
        if(uri) {
            song = await getSong(uri);
            // TODO: define error message
            if(!song) return;
        }

        // Retrieve musicPlayer entry and add song to the queue
        MusicPlayer.get(msg, async (musicPlayer: MusicPlayer) => {
            if(song) {
                // If the added song is the first in queue, start playing
                musicPlayer.add(song);
            }
            
            else {
                logger.info("Query not yet implemented");
                // TODO: query for user input on youtube
            }
        });
    },

    // Transformer that parses the text input before invoking the core command,
    // and handles the message reply with the provided output.
    onMessageCreateTransformer: (msg, _content, args, command) => {
        if(!args.length) return;

        // Check if the user typed a URL or a simple text query
        let uri = undefined, query = undefined;
        if(uriRegex.test(args[0])) uri = args[0];
        else                       query = args.join(" ");

        command({ msg, uri, query }, getSimpleMessageCallback(msg))
    }

    // TODO: slash command handler
}
export default playCommandMetadata;