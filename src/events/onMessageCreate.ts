import { Message, MessagePayload, MessageReplyOptions } from "discord.js";
import Context from "../classes/logging/Context.js";
import { CommandMetadata } from "../commands/types.js";
import Logger from "../classes/logging/Logger.js";
import UserRepository from "../classes/user/UserRepository.js";
import { commandMetadataMap } from "../commands/registration.js";
import querySelectCommandMetadata from "../commands/music/query/querySelectCommand.js";
import { VALID_PREFIX_REGEX } from "../commands/messages/prefixCommand.js";

/** Default prefix that can be used by users to activate text commands.
 *  If default prefix is not defined in the environment, use "ham". */
const DEFAULT_PREFIX: string = process.env.PREFIX ?? "ham";

/** Before exporting, wrap event logic in context init for versbose logging. */
export default function (msg: Message): void {
    Context.initialize({ userId: msg.author.username, serverId: msg.guildId || undefined }, () => onMessageCreate(msg));
}

/** Handle newly created message and reply if a command is called. */
async function onMessageCreate(msg: Message): Promise<void> {
    // If the message author is a bot, ignore
    if (msg.author.bot) return;

    // Normalize message content for better parsing
    const lowerCaseContent: string = msg.content.toLowerCase();

    // Youtube Query: if the message content is a number and there is a pending
    // queryMessage, try to play the song on the musicPlayer
    executeCommand(querySelectCommandMetadata, msg, lowerCaseContent, []);

    // If the user has a custom prefix set, retrieve it - always use the default
    const customPrefix = await UserRepository.getUserPrefix(msg.author.id);
    let prefix = DEFAULT_PREFIX;

    // Compose regex to be used to detect and replace prefix from the message.
    // Put longer prefix first so that, if the custom prefix starts with the
    // default prefix (or vice versa) the prefix is not only partially removed.
    // Ex: custom prefix is H, default is HAM - the cleaned content of the
    //  message "HAM CLAP" would be a "AM CLAP" instead of "CLAP": HAM starts
    //  with H, and only H would be removed if the regex was "H|HAM".
    if (customPrefix) {
        if (customPrefix.length > DEFAULT_PREFIX.length) {
            prefix = customPrefix.concat("|" + prefix);
        } else {
            prefix = prefix.concat("|" + customPrefix);
        }
    }
    const prefixRegex = new RegExp(`^(${prefix})`);

    // If message starts with user's or default prefix, parse and execute the command
    if (prefixRegex.test(lowerCaseContent)) {
        // Remove prefix (and optional following space) from message start
        // and get all the words as command and arguments
        const regex = new RegExp(`^(${prefix})\\s?`, "i");
        let content = msg.content.replace(regex, "");
        const args = content.split(/[\n ]+/);

        // Extract command name from first argument
        // If there is no command, send default message
        const commandName: string | undefined = args.shift()?.toLocaleLowerCase();
        if (!commandName) {
            msgReplyResponseTransformer(msg, { content: "Cazzo vuoi?" });
            return;
        }

        // Validate name characters to avoid errors during RegExp construction
        if(!VALID_PREFIX_REGEX.test(commandName)) return;

        // Remove command name and space from message content before passing it
        content = content.replace(new RegExp(`^(${commandName})\\s?`, "i"), "");

        // If command doesn't exist or it can't be invoked with messages, return
        const commandMetadata: CommandMetadata<any, any> | undefined = commandMetadataMap[commandName];
        if (!commandMetadata || !commandMetadata.onMessage || commandMetadata.hidden) return;

        // Add command name to context and log full message
        Logger.info(msg.content);
        executeCommand(commandMetadata, msg, content, args);
    }

    // If message is not a command, start searching for insults or funny replies
    else {
        const reply: string | undefined = getInsult(lowerCaseContent);
        if (reply) msgReplyResponseTransformer(msg, { content: reply });
    }
}

/** Given message content, retrieve the insult to be replied with. */
function getInsult(content: string): string | undefined {
    // Check replies for the whole message first
    switch (content) {
        case "chi?": case "cosa?": return "stocazzo"
        case "bot di merda": return "Ma tu sei una merda";
        case "baba": return "boey";
        case "good bot": return ": )";
        case "bad bot": return ": (";
        case "per il meme": return "<@192312520567029760>";
    }

    // For each word in the message, check if there is a reply to be returned
    for(const word of content.split(/[\n ]+/)) {
        switch (word) {
            case "grazie": return "grazie al cazzo";
            case "coglione": return "Ma coglione a chi, figlio di puttana?";
            case "bot": return "Cazzo vuoi?";
            case "suca": return "melo";
            case "lol": return "Cazzo ridi che domani muori";
            case "beasty": case "bisty":
            case "bisti": return "per il meme";
            case "zitto": case "taci":
            case "stai zitto":
            case "muto": case "mutati": return "audio";
        }
    }

    // No reply found - return nothing
}

/** The callback function is generic and only takes the command response
 *  as parameter - in order to use the message, bring it into the callback
 *  method scope creating the function when needed. */
export function msgReplyResponseTransformer(msg: Message, reply: string | MessagePayload | MessageReplyOptions) {
    return msg.reply(reply)
        .catch(e => Logger.error("msgReplyResponseTransformer error", e));
}
/** Similar to msgReplyResponseTransformer, but only reacts with an emoji
 *  when the command has been correctly executed. */
export function msgReactResponseTransformer(msg: Message) {
    return msg.react("🤝")
        .catch(e => Logger.error("msgReactResponseTransformer error", e));
}

/** Default error handler method to be used for commands that can be executed
 *  via the onMessageCreateTransformer.
 *  It reacts to the original user message with an emoji. */
export function msgReactErrorHandler(msg: Message, e: Error) {
    Logger.error("Text command execution error\n", e)
    return msg.react("902680070018175016") //  Old emoji: "❌"
        .catch(e => Logger.error("msgReactErrorHandler error", e));
}

async function executeCommand<I, O>({ aliases, command, onMessage }: CommandMetadata<I, O>, msg: Message, content: string, args: string[]) {
    // Core text command logic:
    // - Parse content/args into proper input
    // - Pass input to main command logic and retrieve output
    // - Use output to create a response to the user (if needed)
    // - Handle exceptions creating a response to the user (if needed)
    Context.set("command-id", aliases[0]);
    try {
        const input = await onMessage!.requestTransformer(msg, content, args);
        const output = await command(input);
        await onMessage!.responseTransformer(msg, output);
    } catch (e) {
        await onMessage!.errorHandler(msg, e as Error);
    }
}