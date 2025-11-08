import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const favouritesFirstCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "When the favourites list message is displayed, return to the first page",
    aliases: ["fav-first"],
    hidden: true,

    command: async ({ i }) => {
        await FavouritesMessage.get(i, async (favouritesMessage) => await favouritesMessage?.first().update());
    },

    onButton: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    }
}
export default favouritesFirstCommandMetadata;