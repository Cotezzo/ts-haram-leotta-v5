import { CommandMetadata } from "../../types";
import { Interaction, Message } from "discord.js";
import MusicPlayer from "../../../classes/music/MusicPlayer";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate";

const queueLastCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the queue message is displayed, go to the last page",
    aliases: ["queue-last"],
    hidden: true,

    command: async ({ i }) => {
        await MusicPlayer.get(i, async (musicPlayer: MusicPlayer) => {
            await musicPlayer.queueMessage?.last(musicPlayer)?.update();
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
export default queueLastCommandMetadata;