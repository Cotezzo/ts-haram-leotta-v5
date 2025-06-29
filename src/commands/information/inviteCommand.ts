import { ephemeralReplyErrorHandler, ephemeralReplyResponseTransformer } from "../../events/onInteractionCreate";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate";
import { CommandMetadata } from "../types";

const inviteCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Information", description: "Sends the invite link of the bot.",
    aliases: ["invite", "inv"], usage: "`ham invite`",

    command: () => {
        return { content: "Invitation link: https://discord.com/api/oauth2/authorize?client_id=803895490483322941&permissions=140227505729&scope=applications.commands%20bot" };
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
export default inviteCommandMetadata;