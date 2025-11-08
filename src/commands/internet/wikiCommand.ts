import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import Wikipedia from "../../classes/wikipedia/Wikipedia.js";
import { CommandMetadata } from "../types.js";
import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const wikiCommandMetadata: CommandMetadata<{ query: string, language?: string }, { content: string }> = {
    category: "Internet", description: "Sends the Wikipedia link (and embed) of a topic.",
    aliases: ["wiki"], usage: "`ham wiki clash of clans` // Searches for an english article about `Clash of Clans`\
    \n`ham wiki clash of clans it` // Searches for an italian article about `Clash of Clans`",
    
    command: async ({ query, language }) => {
        // Search for the first article that matches the query and compose uri
        const articles = await Wikipedia.searchArticleTitles(query, 5, language);
        const uri = Wikipedia.getArticleUri(articles[0], language);

        return { content: uri };
    },

    onMessage: {
        requestTransformer: (_msg, _content, args) => {
            let language = undefined;
            if(Wikipedia.isLanguageValid( args[args.length-1] )) {
                language = args.pop();
            }
    
            // If there are arguments left, join the sentence and call che command
            if(!args.length) throw new Error("No text specified");
    
            return { query: args.join(" "), language };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: function(interaction) {
            const query = interaction.options.getString("subject", true);
            const language = interaction.options.getString("language") || undefined;

            // Business logic will validate language
            return { query, language };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default wikiCommandMetadata;