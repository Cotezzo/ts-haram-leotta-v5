import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { CommandMetadata } from "../types.js";

const pregnantCommandMetadata: CommandMetadata<null, { content: string }> = {
    category: "Messages",
    description: "**Leg locks you** **PLAP** **PLAP** **PLAP** GET ME PREGNANT GET ME PREGNANT GET ME PREGNANT! UAAAH! **SQUELCH**",
    aliases: ["pregnant", "pregant", "pragnent", "pargant", "gregnant", "pegnate",
        "pegrent", "pregegnant", "pregonate", "prengan", "prregnant", "pregante",
        "pergert", "pegnat", "pragnet", "pergenat", "prangnet", "pragnan", "pregnart",
        "bregant", "pregarnt", "pregat", "fregnant", "pargnet", "peegnant", "pergnut",
        "pgrenant", "praganant", "prangent", "prefnat", "pregananant", "pregernet",
        "prengt", "prognant", "pretnet"],
    usage: "`ham pregnant`",
    
    command: () => {
        return { content: "https://cdn.discordapp.com/attachments/583333931273682956/1292232041449914378/GET_ME_PREGNANT.mp4?ex=6702fc5f&is=6701aadf&hm=884a101037fb7c11b2c8a365d2a09811f6b8e202ab7c8749f0c59b3f87b84eea&" };
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
export default pregnantCommandMetadata;