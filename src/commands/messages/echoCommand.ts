import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

const echoCommandMetadata: CommandMetadata<{ content: string }, { content: string }> = {
    category: "Messages", description: "Repeats some text.", aliases: ["echo"],
    usage: "`ham echo yoooooo` // Repeats `yoooooo`",
    
    command: ({ content }) => {
        return { content };
    },

    onMessage: {
        requestTransformer: (_msg, content, _args) => {
            if(!content.length) throw new Error("No text specified");
            return { content };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: function(interaction) {
            const content = interaction.options.getString("text", true);
            return { content };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default echoCommandMetadata;