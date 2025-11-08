import { CommandMetadata } from "../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer, ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const skipCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "skips the current song in the queue, \
    playing the next one (if any).",
    aliases: ["skip", "s"], usage: "`ham skip`\n`ham s`",
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.skip();
        });
    },

    onMessage: {
        requestTransformer: (msg, _content, _args) => {
            return { i: msg };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onButton: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default skipCommandMetadata;