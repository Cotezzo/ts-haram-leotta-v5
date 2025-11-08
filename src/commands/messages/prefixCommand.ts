import UserRepository from "../../classes/user/UserRepository.js";
import { ephemeralReplyErrorHandler, ephemeralReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

export const VALID_PREFIX_REGEX: RegExp = /^\w{0,30}$/;

const prefixCommandMetadata: CommandMetadata<{ userId: string, prefix?: string }, { content: string }> = {
    category: "Messages", description: "Manage the bot text commands prefix.",
    aliases: ["prefix"], usage: "`ham prefix`  // display current prefix\
    \n`ham prefix pls`  // change current prefix to `pls`",
    
    command: async ({ userId, prefix }) => {
        // If there are no arguments, don't call the callback and return
        if(!prefix?.length) {
            const p: string | undefined = await UserRepository.getUserPrefix(userId)
            return { content: `Current prefix is \`${p || process.env.PREFIX}\`.` };
        }
        
        // If the rpefix is valid, save it to database
        else if(VALID_PREFIX_REGEX.test(prefix)) {
            await UserRepository.updateUserPrefix(userId, prefix)
            return { content: `Prefix set to \`${prefix}\`.` };
        }
        
        // If the provided prefix is invalid, return error message
        else {
            return { content: `Invalid prefix: you must use at most 20 alphanumeric characters.` };
        }
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            return { userId: msg.author.id, prefix: args.shift() };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: function(interaction) {
            const prefix = interaction.options.getString("prefix", true);
            const userId = interaction.member?.user.id;
            if(!userId) throw new Error("UserId not found");

            return { userId, prefix };
        },
        responseTransformer: ephemeralReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default prefixCommandMetadata;