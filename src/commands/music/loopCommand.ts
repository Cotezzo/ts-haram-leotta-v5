import { CommandMetadata } from "../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer, ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate.js";

const loopCommandMetadata: CommandMetadata<{ i: Message | Interaction, loopPolicy?: MusicPlayer.LoopPolicy }, void> = {
    category: "Music", description: "Changes the loop setting to \"none\", \"song\", \"all\".",
    aliases: ["loop"], usage: "`ham loop` // Moves to the next loop setting (none => song => all)\n\
    `ham loop none` // No loop is set, songs are played normally\n\
    `ham loop song` // The current song loops indefinitely\n\
    `ham loop all`  // The whole playlist loops and skipped songs are added at the end of the queue",
    
    command: async ({ i, loopPolicy }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.setLoopPolicy(loopPolicy);
        })
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            // Parse input loop policy 
            let loopPolicy: string | MusicPlayer.LoopPolicy | undefined = args.pop();
            if(loopPolicy) {
                loopPolicy = loopPolicy.toUpperCase();
                if(loopPolicy === "NONE") loopPolicy = MusicPlayer.LoopPolicy.NONE;
                else if(loopPolicy === "SONG") loopPolicy = MusicPlayer.LoopPolicy.SONG;
                else if(loopPolicy === "ALL") loopPolicy = MusicPlayer.LoopPolicy.ALL;
                else throw new Error("Invalid loopPolicy");
            }
            
            return { i: msg, loopPolicy: loopPolicy as MusicPlayer.LoopPolicy | undefined };
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
            let loopPolicy: undefined | MusicPlayer.LoopPolicy = interaction.options.getNumber("policy") || undefined;
            return { i: interaction, loopPolicy };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default loopCommandMetadata;