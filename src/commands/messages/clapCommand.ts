import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

/** String tu be used to join the "clapped" elements. */
const clap = ' :clap_tone5: ';

const clapCommandMetadata: CommandMetadata<{ words: string[] }, { content: string }> = {
    category: "Messages", description: "Claps some text.", aliases: ["clap"],
    usage: "`ham clap coglione` // c :clap_tone5: o :clap_tone5: g :clap_tone5: l :clap_tone5: i :clap_tone5: o :clap_tone5: n :clap_tone5: e\
    \n`ham clap sei un coglione` // sei :clap_tone5: un :clap_tone5: coglione",
    
    command: ({ words }) => {
        // If there is a single argument, join the single word characters
        if(words.length == 1) words = [...words[0]];
    
        // Join arguments with clapping emoji and call callback
        return { content: words.join(clap) };
    },

    onMessage: {
        requestTransformer: (_msg, _content, args) => {
            // If there are no arguments, don't call the callback and return
            if(!args.length) throw new Error("No text specified");
    
            return { words: args };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: function(interaction) {
            const text = interaction.options.getString("text", true);
            return { words: text.split(/[\n ]+/) };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default clapCommandMetadata;