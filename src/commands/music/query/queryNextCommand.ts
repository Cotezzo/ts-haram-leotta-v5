import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import QueryMessage from "../../../classes/music/message/queryMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const queryNextCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the query message is displayed, go to the next page and load next results",
    aliases: ["query-next"],
    hidden: true,

    command: async ({ i }) => {
        await QueryMessage.get(i, async (queryMessage: QueryMessage) => {
            await queryMessage.next();
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
export default queryNextCommandMetadata;