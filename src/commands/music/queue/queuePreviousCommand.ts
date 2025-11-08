import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../../classes/music/MusicPlayer.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const queuePreviousCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the queue message is displayed, go to the next page",
    aliases: ["queue-previous"],
    hidden: true,

    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.queueMessage?.previous(musicPlayer)?.update();
        });
    },

    onButton: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    }
}
export default queuePreviousCommandMetadata;