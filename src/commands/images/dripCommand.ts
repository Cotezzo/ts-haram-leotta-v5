import { AttachmentBuilder, User } from "discord.js";
import { CommandMetadata } from "../types.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import Images from "../../classes/image/images.js";
import UserRepository from "../../classes/user/UserRepository.js";
import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";

/** Regex to be used to detect if an argument is a file uri or not. */
export const fileRegex = /^https?:\/\/.*$/;
/** Base PNG with the dripping figure image. */
const baseImage: string = "./assets/images/drip.png";
/** Default name for the Discord attachment (final image). */
const imageName: string = "drip.png";

const dripCommandMetadata: CommandMetadata<{ user?: User, file?: string }, { files: AttachmentBuilder[] }> = {
    category: "Images", description: "HE REALLY BE DRIPPIN DOE", aliases: ["drip"],
    usage: "`ham drip` // Drips yourself\
    \n`ham drip @Emre` // Drips the shit out of Emre\
    \n`ham drip emre` // Same",

    command: async ({ user, file }) => {
        // Use input file or retrieve profile picture from input user
        // If no argument is defined, don't do anything
        const path: string = file || user!.displayAvatarURL({ extension: "png", size: 256 });

        // Add provided image to drip base image and invoke callback on success
        const buffer = await Images.overlap(baseImage, [{ path, xPos: 210, yPos: 80, xRes: 256, yRes: 256, round: true }])
        return { files: [ new AttachmentBuilder(buffer, { name: imageName }) ] };
    },

    onMessage: {
        requestTransformer: async (msg, _content, args): Promise<{ user?: User, file?: string }> => {
            const arg: string | undefined = args.shift();
    
            // If the first argument is a file path, directly use it
            if(arg && fileRegex.test(arg)) return { file: arg };
    
            // Try to retrieve mentioned or written user from first argument
            const user: User | undefined = await UserRepository.getUserFromMessage(msg, arg);
            if(!user) throw new Error("User not found");
    
            return { user };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            let user: User | null = interaction.options.getUser("user");
            const file: string | undefined = interaction.options.getString("image") || undefined;

            // No user provided: use interaction author
            if(!user && !file && interaction.member?.user instanceof User) {
                user = interaction.member?.user;
            }

            // No user found: error
            if(!user) throw new Error("User not found");

            return { user, file };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default dripCommandMetadata;