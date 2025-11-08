import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

/** Collections of "sus" links that can be sent when the command is invoked. */
const links: string[] = [
    "https://cdn.discordapp.com/attachments/280489952385695755/788913780934443028/video0.mov",
    "https://cdn.discordapp.com/attachments/620576156613345310/816641727204950046/video0.mp4",
    "https://cdn.discordapp.com/attachments/722780815087501363/787763691658805258/p.mp4"
];

const susCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Messages", description: "SUS!! SUSSY BAKA!!!!", aliases: ["sus"],
    usage: "`ham sus`",

    command: () => {
        // Generate number between 0 (inclusive) and link pool length (exclusive)
        const rand: number = Math.floor(Math.random() * links.length);
    
        // Retrieve link from random index and invoke callback
        return { content: links[ rand ] };
    },

    onMessage: {
        requestTransformer: (_msg, _content, _args) => null,
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (_interaction) => null,
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default susCommandMetadata;