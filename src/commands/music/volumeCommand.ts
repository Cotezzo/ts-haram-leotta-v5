import { msgReactErrorHandler, msgReactResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../classes/music/MusicPlayer.js";
import Logger from "../../classes/logging/Logger.js";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const volumeCommandMetadata: CommandMetadata<{ i: Message | Interaction, volume: number }, void> = {
    category: "Music", description: "Changes the volume of the music.",
    aliases: ["volume", "v"], usage: "`ham volume 0.5` // Lower the songs volume\n\
    `ham volume 10000` // Destroys your ears",
    
    command: async ({ i, volume }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            musicPlayer.setVolume(volume);
        });
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {

            // Retrieve index to be removed - if argument is not a number, return
            let volume: string | number | undefined = args.shift();
            if(!volume)
                throw new Error("No volume specified");
    
            volume = parseFloat(volume.replace(',', '.'));
            if(isNaN(volume) || volume < 0)
                throw new Error("Invalid volume specified");
    
            Logger.debug("New volume: "+volume);
    
            return { i: msg, volume };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            const volume = interaction.options.getNumber("volume", true);
            return { i: interaction, volume };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default volumeCommandMetadata;