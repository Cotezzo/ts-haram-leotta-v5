import { REST, Routes, SlashCommandBuilder } from "discord.js";
import Logger from "./classes/logging/Logger.js";
import dripCommandMetadata from "./commands/images/dripCommand.js";
import lessgoCommandMetadata from "./commands/images/lessgoCommand.js";
import picCommandMetadata from "./commands/images/picCommand.js";
import changelogsCommandMetadata from "./commands/information/changelogsCommand.js";
import helpCommandMetadata from "./commands/information/helpCommand.js";
import { commandMetadataMap, commandMetadatas, registerCommands } from "./commands/registration.js";
import infoCommandMetadata from "./commands/information/infoCommand.js";
import inviteCommandMetadata from "./commands/information/inviteCommand.js";
import pingCommandMetadata from "./commands/information/pingCommand.js";
import redditCommandMetadata from "./commands/internet/redditCommand.js";
import translateCommandMetadata from "./commands/internet/translateCommand.js";
import wikiCommandMetadata from "./commands/internet/wikiCommand.js";
import clapCommandMetadata from "./commands/messages/clapCommand.js";
import coinflipCommandMetadata from "./commands/messages/coinflipCommand.js";
import echoCommandMetadata from "./commands/messages/echoCommand.js";
import paccoCommandMetadata from "./commands/messages/paccoCommand.js";
import pregnantCommandMetadata from "./commands/messages/pregnantCommand.js";
import susCommandMetadata from "./commands/messages/susCommand.js";
import playCommandMetadata from "./commands/music/playCommand.js";
import favouritesAddCommandMetadata from "./commands/music/favourites/favouritesAddCommand.js";
import favouritesCommandMetadata from "./commands/music/favourites/favouritesCommand.js";
import favouritesRemoveCommandMetadata from "./commands/music/favourites/favouritesRemoveCommand.js";
import playMixCommandMetadata from "./commands/music/mix/playMixCommand.js";
import skipMixCommandMetadata from "./commands/music/mix/skipMixCommand.js";
import queueCommandMetadata from "./commands/music/queue/queueCommand.js";
import backCommandMetadata from "./commands/music/backCommand.js";
import clearCommandMetadata from "./commands/music/clearCommand.js";
import loopCommandMetadata from "./commands/music/loopCommand.js";
import MusicPlayer from "./classes/music/MusicPlayer.js";
import nowPlayingCommandMetadata from "./commands/music/nowPlayingCommand.js";
import pauseCommandMetadata from "./commands/music/pauseCommand.js";
import removeCommandMetadata from "./commands/music/removeCommand.js";
import shuffleCommandMetadata from "./commands/music/shuffleCommand.js";
import skipCommandMetadata from "./commands/music/skipCommand.js";
import unpauseCommandMetadata from "./commands/music/unpauseCommand.js";
import volumeCommandMetadata from "./commands/music/volumeCommand.js";
import prefixCommandMetadata from "./commands/messages/prefixCommand.js";

/* ==== METHODS ============================================================= */
/** Secret token of the bot / application */
const token: string | undefined = process.env.TOKEN;
/** UserId of the bot / application */
const appId: string | undefined = process.env.APPID;

export async function registerSlashCommands(deleteGlobally: boolean, registerGlobally: boolean, guildId: string | undefined = undefined) {
    await registerCommands();

    for(const slashCommand of slashCommands) {
        const commandName = slashCommand.name;
        if(!commandMetadataMap[commandName]?.onSlash) {
            throw new Error(`Command "${commandName}" has no "onSlash" handler and cannot be registered`);
        }
    }
    
    if(!token) throw new Error("No token found");
    if(!appId) throw new Error("No appId found");
    Logger.info(`Registering commands for appId ${appId}`);

    // Discord REST instance for easy REST API calls
    const rest: REST = new REST().setToken(token);
    // Path to be called in order to retrieve, delete and register commands
    const route = Routes.applicationCommands(appId);

    // Delete all the previously registered commands
    if (deleteGlobally) {
        // Retrieve all commands already registered for the app
        Logger.info(`GET ${route}`);
        const commands: any = await rest.get(route);

        // Start deletion for all the commands and await
        await Promise.all(
            commands.map((command: any) => {
                Logger.info(`DELETE ${route}/${command.id}`);
                return rest.delete(`${route}/${command.id}`)
            })
        );
        Logger.info(`Successfully deleted ${commands.length} application {/} commands globally.`);
    }

    if(registerGlobally) {
        // Register all the commands globally
        Logger.info(`PUT ${route}`);
        const commands: any = await rest.put(route, { body: slashCommands });
        Logger.info(`Successfully reloaded ${commands.length} application {/} commands globally.`);
    }

    if(guildId) {
        // Retrieve guild registration route and register only there
        const guildRoute = Routes.applicationGuildCommands(appId, guildId);
        Logger.info(`PUT ${guildRoute}`);
        const commands: any = await rest.put(guildRoute, { body: slashCommands });
        Logger.info(`Successfully reloaded ${commands.length} application {/} commands for guild ${guildId}.`);

    }
}

/* ==== COMMAND BUILDERS ==================================================== */
export const slashCommands = [
    // Images
    new SlashCommandBuilder()
        .setName(dripCommandMetadata.aliases[0])
        .setDescription(dripCommandMetadata.description)
        .addUserOption(option => option
            .setName("user")
            .setDescription("User to be dripped.")
            .setRequired(false)
        )
        .addAttachmentOption(option => option
            .setName("image")
            .setDescription("Image to be dripped.")
            .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName(lessgoCommandMetadata.aliases[0])
        .setDescription(lessgoCommandMetadata.description)
        .addUserOption(option => option
            .setName("user")
            .setDescription("User to be LESSGOOOOOOOOOOOOOOO'd.")
            .setRequired(false)
        )
        .addAttachmentOption(option => option
            .setName("image")
            .setDescription("Image to be LESSGOOOOOOOOOOOOOOO'd.")
            .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName(picCommandMetadata.aliases[0])
        .setDescription(picCommandMetadata.description)
        .addUserOption(option => option
            .setName("user")
            .setDescription("User you want to see the propic of.")
            .setRequired(false)
        )
        .toJSON(),


    // Information
    new SlashCommandBuilder()
        .setName(changelogsCommandMetadata.aliases[0])
        .setDescription(changelogsCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(helpCommandMetadata.aliases[0])
        .setDescription(helpCommandMetadata.description)
        .addStringOption(option => option
            .setName("command")
            .setDescription("Command you want to know more about.")
            .setAutocomplete(true)
            .addChoices(
                ...commandMetadatas.filter(c => !c.hidden).map(c => ({ name: `/${c.aliases[0]}`, value: c.aliases[0] }) )
            )
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(infoCommandMetadata.aliases[0])
        .setDescription(infoCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(inviteCommandMetadata.aliases[0])
        .setDescription(inviteCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(pingCommandMetadata.aliases[0])
        .setDescription(pingCommandMetadata.description)
        .toJSON(),

    // Internet
    new SlashCommandBuilder()
        .setName(redditCommandMetadata.aliases[0])
        .setDescription(redditCommandMetadata.description)
        .addStringOption(option => option
            .setName("subreddit")
            .setDescription("Subreddit you want to explore.")
            .setRequired(true)
            .setMaxLength(32)
        )
        .addStringOption(option => option
            .setName("sortby")
            .setDescription("Sort posts by trending, new or top.")
            .setChoices(
                { name: "hot", value: "hot"},
                { name: "new", value: "new"},
                { name: "top", value: "top"},
            )
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(translateCommandMetadata.aliases[0])
        .setDescription(translateCommandMetadata.description)
        .addStringOption(option => option
            .setName("text")
            .setDescription("Text you want to translate.")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("targetlanguage")
            .setDescription("Language in which to translate the text (en, it, ...).")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("sourcelanguage")
            .setDescription("Language from which to translate the text (en, it, ...).")
            .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(wikiCommandMetadata.aliases[0])
        .setDescription(wikiCommandMetadata.description)
        .addStringOption(option => option
            .setName("subject")
            .setDescription("Subject you want to know more about.")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option => option
            .setName("language")
            .setDescription("Language in which you want to read the article (en, it, ...).")
            .setRequired(false)
        )
        .toJSON(),

    // Messages
    new SlashCommandBuilder()
        .setName(clapCommandMetadata.aliases[0])
        .setDescription(clapCommandMetadata.description)
        .addStringOption(option => option
            .setName("text")
            .setDescription("Text to be clapped.")
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(coinflipCommandMetadata.aliases[0])
        .setDescription(coinflipCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(echoCommandMetadata.aliases[0])
        .setDescription(echoCommandMetadata.description)
        .addStringOption(option => option
            .setName("text")
            .setDescription("Text to be repeated.")
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(paccoCommandMetadata.aliases[0])
        .setDescription(paccoCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(prefixCommandMetadata.aliases[0])
        .setDescription(prefixCommandMetadata.description)
        .addStringOption(option => option
            .setName("prefix")
            .setDescription("New prefix to be set.")
            .setMinLength(1)
            .setMaxLength(30)
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(pregnantCommandMetadata.aliases[0])
        // Original description is too long
        //.setDescription(pregnantCommandMetadata.description.substring(0, 100))
        .setDescription("*Leg locks you* *PLAP* *PLAP* GET ME PREGNANT GET ME PREGNANT! UAAAH!")
        .toJSON(),
    new SlashCommandBuilder()
        .setName(susCommandMetadata.aliases[0])
        .setDescription(susCommandMetadata.description)
        .toJSON(),

    // Music
    new SlashCommandBuilder()
        .setName(favouritesCommandMetadata.aliases[0])
        .setDescription(favouritesCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(favouritesAddCommandMetadata.aliases[0])
        .setDescription(favouritesAddCommandMetadata.description)
        .addNumberOption(option => option
            .setName("index")
            .setDescription("Position in the queue of the song to be added.")
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(favouritesRemoveCommandMetadata.aliases[0])
        .setDescription(favouritesRemoveCommandMetadata.description)
        .addNumberOption(option => option
            .setName("index")
            .setDescription("Position in the favoutires list of the song to be removed.")
            .setMinValue(1)
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(playMixCommandMetadata.aliases[0])
        .setDescription(playMixCommandMetadata.description)
        .addNumberOption(option => option
            .setName("link")
            .setDescription("Youtube video to use as the mix generation.")
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(skipMixCommandMetadata.aliases[0])
        .setDescription(skipMixCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(queueCommandMetadata.aliases[0])
        .setDescription(queueCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(backCommandMetadata.aliases[0])
        .setDescription(backCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(clearCommandMetadata.aliases[0])
        .setDescription(clearCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(loopCommandMetadata.aliases[0])
        .setDescription(loopCommandMetadata.description)
        .addNumberOption(option => option
            .setName("policy")
            .setDescription("Type of loop to be set")
            .setRequired(false)
            .addChoices(
                { name: "ALL", value: MusicPlayer.LoopPolicy.ALL },
                { name: "NONE", value: MusicPlayer.LoopPolicy.NONE },
                { name: "SONG", value: MusicPlayer.LoopPolicy.SONG }
            )
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(nowPlayingCommandMetadata.aliases[0])
        .setDescription(nowPlayingCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(pauseCommandMetadata.aliases[0])
        .setDescription(pauseCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(playCommandMetadata.aliases[0])
        .setDescription(playCommandMetadata.description.split("\n", 1)[0])
        .addStringOption(option => option
            .setName("link")
            .setDescription("Song url to be played.")
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName("query")
            .setDescription("Title to be searched on Youtube.")
            .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(removeCommandMetadata.aliases[0])
        .setDescription(removeCommandMetadata.description)
        .addNumberOption(option => option
            .setName("index")
            .setDescription("Position in the queue of the song to be removed.")
            .setMinValue(1)
            .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName(shuffleCommandMetadata.aliases[0])
        .setDescription(shuffleCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(skipCommandMetadata.aliases[0])
        .setDescription(skipCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(unpauseCommandMetadata.aliases[0])
        .setDescription(unpauseCommandMetadata.description)
        .toJSON(),
    new SlashCommandBuilder()
        .setName(volumeCommandMetadata.aliases[0])
        .setDescription(volumeCommandMetadata.description)
        .addNumberOption(option => option
            .setName("volume")
            .setDescription("Value to be set.")
            .setMinValue(0)
            .setRequired(true)
        )
        .toJSON()
];

(async () => {
    Logger.info("Starting slash command registration script...");
    await registerSlashCommands(false, true, "863192103248592946");
    process.exit(0);
})();