import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer.js";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const removeCommandMetadata: CommandMetadata<{ i: Message | Interaction, index: number }, void> = {
    category: "Music", description: "Plays the previous song in the queue.",
    aliases: ["remove", "rm"], usage: "`ham remove 2` // Removes the second song from the queue",
    
    command: async ({ i, index }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.remove(index);
        });
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            // Retrieve index to be removed - if argument is not a number, return
            let index: string | number | undefined = args.pop();
            if(!index) throw new Error("No index provided");
            index = parseInt(index);
            if(isNaN(index) || index < 1) throw new Error("Invalid index");
            
            return { i: msg, index: --index };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            const index = interaction.options.getNumber("index", true);
            return { i: interaction, index };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default removeCommandMetadata;