import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const favouritesLastCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the favourites list message is displayed, go to the last page",
    aliases: ["fav-last"],
    hidden: true,

    command: async ({ i }) => {
        await FavouritesMessage.get(i, async (favouritesMessage) => await favouritesMessage?.last().update());
    },

    onButton: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    }
}
export default favouritesLastCommandMetadata;