import { EmbedBuilder, User } from "discord.js";
import { CommandMetadata } from "../types.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import HaramLeotta from "../../index.js";
import UserRepository from "../../classes/user/UserRepository.js";
import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const picCommandMetadata: CommandMetadata<{ user: User }, { embeds: EmbedBuilder[] }> = {
    category: "Images", description: "Sends the pic of a user.", aliases: ["pic"],
    usage: "`ham pic` // Sends your propic\
    \n`ham pic @Emre` // Sends Emre's propic\
    \n`ham pic emre` // Same",

    command: ({ user }) => {
        const embed = new EmbedBuilder()
            .setColor(HaramLeotta.get().embedColor)
            .setAuthor({name: user.displayName, iconURL: user.avatarURL()! })
            .setImage(user.displayAvatarURL({ extension: "webp", forceStatic: true, size: 4096 }))
    
        return { embeds: [ embed ] };
    },

    onMessage: {
        requestTransformer: async (msg, _content, args) => {
            const arg: string | undefined = args.shift();
            
            // Try to retrieve mentioned or written user from first argument
            const user = await UserRepository.getUserFromMessage(msg, arg);
            if(!user) throw new Error("User not found");
    
            return { user };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            let user: User | null = interaction.options.getUser("user");

            // No user provided: use interaction author
            if(!user && interaction.member?.user instanceof User) {
                user = interaction.member?.user;
            }

            // No user found: error
            if(!user) throw new Error("User not found");

            return { user };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default picCommandMetadata;