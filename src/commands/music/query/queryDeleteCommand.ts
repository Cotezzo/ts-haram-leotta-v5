import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import QueryMessage from "../../../classes/music/message/queryMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const queryDeleteCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Deletes the displayed query message",
    aliases: ["query-delete"],
    hidden: true,
    
    command: async ({ i }) => {
        await QueryMessage.get(i, async (queryMessage: QueryMessage) => {
            await queryMessage.destroy();
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
export default queryDeleteCommandMetadata;