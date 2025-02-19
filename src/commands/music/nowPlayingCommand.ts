import { CommandMetadata } from "../types";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer";
import {  msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate";

const nowPlayingCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Shows the currently playing song",
    aliases: ["nowplaying", "np"], usage: "`ham nowplaying`\n`ham np`",
    
    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.nowPlayingMessage?.updateContent(musicPlayer)?.resend();
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
export default nowPlayingCommandMetadata;