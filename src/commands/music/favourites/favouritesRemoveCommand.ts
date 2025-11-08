import { CommandMetadata } from "../../types.js";
import { Interaction, Message } from "discord.js";
import UserRepository from "../../../classes/user/UserRepository.js";
import { msgReactErrorHandler, msgReactResponseTransformer } from "../../../events/onMessageCreate.js";
import FavouritesMessage from "../../../classes/music/message/favouritesMessage.js";
import { ephemeralReplyErrorHandler, noReplyResponseTransformer } from "../../../events/onInteractionCreate.js";

const favouritesRemoveCommandMetadata: CommandMetadata<{ i: Message | Interaction, index: number }, void> = {
    category: "Music", description: "Removes a song from the favourites.",
    aliases: ["favouritesremove", "fr"],
    usage: "`ham fr 4` // Removes the selected songs from your favourites",

    command: async ({ i, index }) => {
        const userId = i.member?.user.id;
        if(!userId) throw new Error("No userId found");

        // Remove the song at the given index from the favourites for the user
        await UserRepository.deleteUserFavourite(userId, index);

        // If there is a favouriteMessage instance, update its content
        await FavouritesMessage.get(i, async (favouritesMessage) => {
            if(favouritesMessage) {
                await favouritesMessage.updateQueue();
                await favouritesMessage.updateContent().update();
            }
        });
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            // Retrieve index to be removed - if argument is not a number, return
            let index: string | number | undefined = args.pop();
            if(!index) throw new Error("No index provided");
            index = parseInt(index);
            if(isNaN(index) || index < 1) throw new Error("Invalid index");
    
            return { i: msg, index: --index };
        },
        responseTransformer: msgReactResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            const index = interaction.options.getNumber("index", true);
            return { i: interaction, index };
        },
        responseTransformer: noReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default favouritesRemoveCommandMetadata;