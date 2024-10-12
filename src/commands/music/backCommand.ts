import { CommandMetadata } from "../types";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer, ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate";

const backCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Plays the previous song in the queue.",
    aliases: ["back", "b"], usage: "`ham back`\n`ham b`",
    
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.back();
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
export default backCommandMetadata;