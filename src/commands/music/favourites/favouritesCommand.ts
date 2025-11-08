import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate.js";
import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage.js";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../../events/onInteractionCreate.js";

const favouritesCommandMetadata: CommandMetadata<{ i: Message | Interaction }, void> = {
    category: "Music", description: "Shows all the songs added to your favourites.",
    aliases: ["favourites", "f"], usage: "`ham favourites`\n`ham f`",

    command: async ({ i }) => {
        // Force message creation (hence the "!")
        await FavouritesMessage.get(i, async (favouritesMessage) =>
            await favouritesMessage!
                .updateContent()
                .send()
        , true);
    },

    onMessage: {
        requestTransformer: (msg, _content, _args) => {
            return { i: msg };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            return { i: interaction };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default favouritesCommandMetadata;