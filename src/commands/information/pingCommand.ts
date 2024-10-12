import HaramLeotta from "../..";
import { ephemeralReplyErrorHandler, ephemeralReplyResponseTransformer } from "../../events/onInteractionCreate";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate";
import { CommandMetadata } from "../types";

const pingCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Information", description: "WebSocket ping in milliseconds.",
    aliases: ["ping"], usage: "`ham ping`",

    command: () => {
        return { content: `Pong! (${HaramLeotta.get().ws.ping}ms)` };
    },

    onMessage: {
        requestTransformer: (_msg, _content, _args) => null,
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (_interaction) => null,
        responseTransformer: ephemeralReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default pingCommandMetadata;