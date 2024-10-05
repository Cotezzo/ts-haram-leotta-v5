import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate";
import { CommandMetadata } from "../types";

/** Coinflip possible outcomes - always 2 */
const emojis: string[] = [":head_bandage:", ":cross:"];

const coinflipCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Messages", description: "Lets the bot decide for you.",
    aliases: ["coinflip", "coin"], usage: "`ham coinflip`",
    
    command: () => {
        // Generate number between 0 (inclusive) and 2 (exclusive)
        const rand: number = Math.floor(Math.random() * 2);

        // Retrieve outcome from random index and invoke callback
        return { content: emojis[rand] };
    },

    onMessage: {
        requestTransformer: (_msg, _content, _args) => null,
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    }

    // TODO: slash command handler
}
export default coinflipCommandMetadata;