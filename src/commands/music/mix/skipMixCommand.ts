import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../../classes/music/MusicPlayer.js";
import { CommandMetadata } from "../../types.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate.js";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../../events/onInteractionCreate.js";

const skipMixCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "skips the current song or mix in the queue, \
    playing the next song (if any).",
    aliases: ["skipmix", "sm"], usage: "`ham skipmix`\n`ham sm`",
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.skip(true);
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
export default skipMixCommandMetadata;