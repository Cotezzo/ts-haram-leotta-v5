import { AnySelectMenuInteraction, AttachmentBuilder, ButtonInteraction, CommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { commandMetadataMap } from "../commands/registration.js";
import Context from "../classes/logging/Context.js";
import { CommandMetadata } from "../commands/types.js";
import Logger from "../classes/logging/Logger.js";

export default function (interaction: Interaction): void {
    // Before executing any logic, initialize context for verbose logging
    Context.initialize({ userId: interaction.user.username, serverId: interaction.guildId || undefined }, () => onInteractionCreate(interaction));
}

/** Handle newly created message and reply if a command is called. */
async function onInteractionCreate(interaction: Interaction): Promise<void> {
    // If the interaction author is a bot, ignore
    if(interaction.user.bot) return;

    const isButton = interaction.isButton();
    const isSelect = interaction.isStringSelectMenu();
    const isSlash = interaction.isChatInputCommand();

    let commandName: string | undefined;

    // Only supports button and selectMenu interactions for now
    // Extract command name from interaction
    if(isButton || isSelect) {
        commandName = interaction.customId.toLocaleLowerCase();
    } else if(isSlash) {
        commandName = interaction.commandName.toLocaleLowerCase();
    } else return;

    // Search for the corresponding metadata and invoke handler method to
    // correctly prepare input parameters and handle callbacks
    const commandMetadata: CommandMetadata<any, any> | undefined = commandMetadataMap[commandName];
    if(!commandMetadata) return;
    const { aliases, command, onButton, onSelect, onSlash } = commandMetadata;

    // Add command name to context and log full message
    Context.set("command-id", aliases[0]);

    // Handle button interactions
    if(isButton) {
        if(!onButton) return;
        Logger.info("Button clicked");

        try {
            const input = await onButton.requestTransformer(interaction);
            const output = await command(input);
            await onButton.responseTransformer(interaction, output);
        } catch(e) {
            await onButton.errorHandler(interaction, e as Error);
        }
    }

    // Handle selectMenu interactions
    if(isSelect) {
        if(!onSelect) return;
        Logger.info(`Selected ${JSON.stringify(interaction.values)}`);
        
        try {
            const input = await onSelect.requestTransformer(interaction);
            const output = await command(input);
            await onSelect.responseTransformer(interaction, output);
        } catch(e) {
            await onSelect.errorHandler(interaction, e as Error);
        }
    }

    // Handle slashCommand interactions
    if(isSlash) {
        if(!onSlash) return;
        Logger.info(`/${commandName} ${JSON.stringify(interaction.options.data)}`);
        
        try {
            const input = await onSlash.requestTransformer(interaction);
            const output = await command(input);
            await onSlash.responseTransformer(interaction, output);
        } catch(e) {
            await onSlash.errorHandler(interaction, e as Error);
        }
    }
}

export function deferUpdateResponseTransformer(interaction: ButtonInteraction | AnySelectMenuInteraction, _: any) {
    return interaction.deferUpdate()
        .catch(e => Logger.error("deferUpdateResponseTransformer error", e));
}

/** Default error handler method to be used for commands that can be executed
 *  via the onInteractionCreateTransformer (Button and SelectMenu interactions).
 *  It reacts to the original user message with an emoji. */
export function deferUpdateErrorHandler(interaction: ButtonInteraction | AnySelectMenuInteraction, e: Error) {
    Logger.error("Button or SelectMenu interaction execution error\n", e)
    return interaction.deferUpdate()
        .catch(e => Logger.error("deferUpdateErrorHandler error", e));
}

export function noReplyResponseTransformer(interaction: CommandInteraction, _: any) {
    return interaction.deferReply({ ephemeral: true }).then(_ => interaction.deleteReply())
        .catch(e => Logger.error("noReplyResponseTransformer error", e));
}

export function ephemeralReplyResponseTransformer(interaction: CommandInteraction, { content, files, embeds }: { content?: string, files?: AttachmentBuilder[], embeds?: EmbedBuilder[] }) {
    return interaction.reply({ ephemeral: true, content, files, embeds })
        .catch(e => Logger.error("deferReplyResponseTransformer error", e));
}
export function interactionReplyResponseTransformer(interaction: CommandInteraction, { content, files, embeds }: { content?: string, files?: AttachmentBuilder[], embeds?: EmbedBuilder[] }) {
    return interaction.reply({ content, files, embeds })
        .catch(e => Logger.error("interactionReplyResponseTransformer error", e));
}

/** Default error handler method to be used for commands that can be executed
 *  via the onInteractionCreateTransformer (CommandInteractions).
 *  It reacts to the original user message with an emoji. */
export function ephemeralReplyErrorHandler(interaction: CommandInteraction, e: Error) {
    Logger.error("Command interaction execution error\n", e)
    return interaction.reply({ ephemeral: true, content: "Error during command execution" })
        .catch(e => Logger.error("deferReplyErrorHandler error", e));
}