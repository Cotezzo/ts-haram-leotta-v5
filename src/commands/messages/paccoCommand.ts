import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

const paccoCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Messages", description: "Pacco Amazon 😳", aliases: ["pacco"],
    usage: "`ham pacco`",
    
    command: () => {
        return { content: ":billed_cap:\n:flushed:      :selfie_tone5:\n:coat::package:\n:shorts:\n:hiking_boot:" };
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
export default paccoCommandMetadata;