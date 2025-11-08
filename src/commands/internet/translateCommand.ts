import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";
import GoogleTranslate from "../../classes/translate/GoogleTranslate.js";
import { emptyErrorHandler } from "../../events/onMessageReactionAdd.js";
import Logger from "../../classes/logging/Logger.js";
import { PartialGroupDMChannel } from "discord.js";
import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const translateCommandMetadata: CommandMetadata<{ query: string, targetLanguage: string, sourceLanguage?: string }, { content: string }> = {
    category: "Internet", description: "Translates some text into another language.",
    aliases: ["translate", "tl"], usage: "`ham translate ciao it en` // Translates `ciao` from italian to english\
    \n`ham translate ciao en` // Translates `ciao` to english, recognizing source language",
    
    command: async ({ query, targetLanguage, sourceLanguage }) => {
        // Retrieve translated text from Google
        const text: string = await GoogleTranslate.translate(query, targetLanguage, sourceLanguage);
        return { content: text };
    },

    onMessage: {
        requestTransformer: (_msg, _content, args) => {
            // targetLanguage is expected to be the last argument
            let targetLanguage: string | undefined = args.pop();
            if(!targetLanguage) throw new Error("No target language specified");
            
            // If last arg (before toLang) is a language, use it as source language
            let sourceLanguage: string | undefined;
            if(GoogleTranslate.isLanguageValid(args[args.length-1])) {
                sourceLanguage = args.pop();
            }
            
            // If there are arguments left, join the sentence and call che command
            if(!args.length) throw new Error("No text specified");
            
            return { query: args.join(" "), targetLanguage, sourceLanguage };
        },
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    },

    onReaction: {
        requestTransformer: function({ reaction }) {
            // Extract reaction emoji (if any) and check whether it's a flag
            const emoji = reaction.emoji.name;
            Logger.debug(`emoji: ${emoji}`);
            if(!emoji || GoogleTranslate.flagEmojiRegex.test(emoji))
                throw new Error("Invalid emoji provided");

            // Parse flag emoji and retrieve corresponding target language
            const countryCode = GoogleTranslate.emojiToCountryCode(emoji);
            Logger.debug(`countryCode: ${countryCode}`);
            const targetLanguage = GoogleTranslate.countryCodeToLanguage[countryCode];
            Logger.debug(`targetLanguage: ${targetLanguage}`);

            // If no target language found for the given flag, throw
            if(!targetLanguage) throw new Error("No targetLanguage found");
    
            // Compose content to be translated
            const query: string | undefined = reaction.message.content?.split(/[\n ]+/).join(" ");
            if(!query) throw new Error("No text provided");

            return { query, targetLanguage };
        },
        responseTransformer: ({ reaction }, { content }) => {
            // PartialGroupDMChannel (whatever that is) doesn't support sending
            // messages, so if the message has been sent there, ignore the command.
            const channel = reaction.message.channel;
            if (!channel || channel instanceof PartialGroupDMChannel )
                throw new Error("Invalid reaction.message.channel");

            return channel.send/*reaction.message.reply*/({ content : `${reaction.emoji.name}: ${content}`})
                .catch(e => Logger.error("responseTransformer error", e));
        },
        errorHandler: emptyErrorHandler
    },

    onSlash: {
        requestTransformer: function(interaction) {
            const query = interaction.options.getString("text", true);
            const targetLanguage = interaction.options.getString("targetlanguage", true);
            const sourceLanguage = interaction.options.getString("sourcelanguage") || undefined;

            // Business logic will validate target and source language
            return { query, targetLanguage, sourceLanguage };
        },
        responseTransformer: interactionReplyResponseTransformer,
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default translateCommandMetadata;