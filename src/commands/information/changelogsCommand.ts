import { EmbedBuilder } from "discord.js";
import { CommandMetadata } from "../types";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate";
import HaramLeotta from "../..";

const changelogsCommandMetadata: CommandMetadata<null, { embeds: EmbedBuilder[] }> = {
    category: "Information", description: "News and notes about the bot code and functionalities.",
    aliases: ["changelogs", "changelog", "changes"], usage: "`ham changes`",
    
    command: () => {
        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor(HaramLeotta.get().embedColor)
            .setTitle(`Haram Leotta v${HaramLeotta.get().version} changelog: `)
            .addFields({ name: "v5 is here!", value:"Complete code refactor (again)" });
    
        return { embeds: [ embed ] };
    },

    onMessage: {
        requestTransformer: (_msg, _content, _args) => null,
        responseTransformer: msgReplyResponseTransformer,
        errorHandler: msgReactErrorHandler
    }

    // TODO: slash command handler
}
export default changelogsCommandMetadata;