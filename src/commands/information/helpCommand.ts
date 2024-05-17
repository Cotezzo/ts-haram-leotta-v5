import { EmbedBuilder } from "discord.js";
import { CommandMetadata } from "../../types/coreCommand";
import { commandMetadatas, getSimpleMessageCallback } from "../../events/onMessageCreate";

/** Define command metadata and handler methods for text and slash commands. */
export const helpCommandMetadata: CommandMetadata<{ command: string }, { embeds: EmbedBuilder[] }> = {
    // Command metadata for "help" command and general info about the command
    category: "Information", description: "Shows the list of available commands and their usage.",
    aliases: ["help"],
    usage: "`ham help` // Displays complete command list\
    \n`ham help drip` // Displays info and usage of `drip` command",
    
    // Actual core command with business logic implementation
    command: (self, { command }, callback) => {
        //const embed = command ? generalHelpEmbed : getCommandEmbed(command);
        const embed = new EmbedBuilder()
        .setColor(self.embedColor);
    
        // If the command arguments has been passed and it is an actual command,
        // create embed for the specific requested command and add more information
        const commandMetadata = command ? commandMetadatas[command] : undefined;
        if(commandMetadata) {
            embed.setTitle(`Command '${command}' help`)
            .addFields([
                { name: "Category", value: commandMetadata.category },
                { name: "Description", value: commandMetadata.description }
            ])
            if(commandMetadata.aliases.length > 1) {
                embed.addFields([{ name: "Aliases", value: `\`${commandMetadata.aliases.join(`\`, \``)}\`` }])
            }
            if(commandMetadata.usage) {
                embed.addFields([{ name: "Usage", value: commandMetadata.usage }])
            }
            //.setFooter({text:"<requried> - [optional]"})
        } else {
            // Categorize currently available commands into arrays
            const categories: { [k: string]: string[] } = {};
            for(const [name, {category}] of Object.entries(commandMetadatas)) {
                if(categories[category])    categories[category].push(name);
                else                        categories[category] = [name];
            }
            
            // Compose embed with available commands
            embed.setTitle("Available Commands")
                .addFields(
                    Object.entries(categories)
                    .map( ([name, value]) => { return { name, value: `\`${value.join(`\`, \``)}\``} } )
                );
        }
    
        // Join arguments with clapping emoji and call callback
        callback( { embeds: [ embed ] } );
    },

    // Transformer that parses the text input before invoking the core command,
    // and handles the message reply with the provided output.
    onMessageCreateTransformer: (self, msg, _content, args, command) =>
        command(self, { command: args[0] }, getSimpleMessageCallback(msg))

    // TODO: slash command handler
}