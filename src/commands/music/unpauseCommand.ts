import { CommandMetadata } from "../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer, ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const unpauseCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Unpauses the playing song.",
    aliases: ["unpause", "ups"], usage: "`ham unpause`\n`ham ups`",
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.unpause();
        })
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
export default unpauseCommandMetadata;