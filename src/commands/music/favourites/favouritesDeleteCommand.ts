import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage.js";
import { deferUpdateErrorHandler, deferUpdateResponseTransformer } from "../../../events/onInteractionCreate.js";

const favouritesDeleteCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Deletes the displayed favourites list message.",
    aliases: ["fav-delete"],
    hidden: true,

    command: async ({ i }) => {
        await FavouritesMessage.get(i, async (favouritesMessage) => await favouritesMessage?.delete());
    },

    onButton: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: deferUpdateResponseTransformer,
        errorHandler: deferUpdateErrorHandler
    }
}
export default favouritesDeleteCommandMetadata;