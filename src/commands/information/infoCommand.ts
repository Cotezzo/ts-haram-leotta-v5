import { EmbedBuilder } from "discord.js";
import { CommandMetadata } from "../types.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import HaramLeotta from "../../index.js";
import { ephemeralReplyErrorHandler, ephemeralReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const infoCommandMetadata: CommandMetadata<null, { embeds: EmbedBuilder[] }> = {
    category: "Information", description: "Lets the bot speak a bit about himself",
    aliases: ["info"], usage: "`ham info`",
    
    command: () => {
        const bot = HaramLeotta.get();
        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor(bot.embedColor)
            .setTitle("Haram Leotta informations")
            .setThumbnail(bot.user?.avatarURL() as string | null)
            .addFields(
                { name: "First name",   value: "Haram",             inline: true },
                { name: "Middle name",  value: "Ibra",              inline: true },
                { name: "Surname",      value: "Leotta",            inline: true },
                { name: "Birthday",     value: `<t:1608163200:D>`,  inline: true },
                { name: "Version",      value: bot.version,         inline: true }
            );
    
        return { embeds: [ embed ] };
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
export default infoCommandMetadata;