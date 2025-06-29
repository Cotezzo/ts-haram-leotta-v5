import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate";
import { CommandMetadata } from "../types";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate";

const shuffleCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Shuffles the queue songs.",
    aliases: ["shuffle", "sh"], usage: "`ham shuffle`",
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.shuffle();
        });
    },

    onMessage: {
        requestTransformer: (msg, _content, _args) => {
            return { i: msg };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default shuffleCommandMetadata;