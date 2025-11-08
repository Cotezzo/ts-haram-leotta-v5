import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import QueryMessage from "../../../classes/music/message/queryMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const queryPreviousCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the query message is displayed, go to the previous page",
    aliases: ["query-previous"],
    hidden: true,

    command: async ({ i }) => {
        await QueryMessage.get(i, async (queryMessage: QueryMessage) => {
            await queryMessage.previous();
            await queryMessage.update();
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
export default queryPreviousCommandMetadata;