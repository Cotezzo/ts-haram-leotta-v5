import HaramLeotta from "..";
import Logger from "../classes/logging/Logger";
import MongooseConfig from "../data/MongooseConfig";
import { registerCommands } from "../commands/registration";
import Wikipedia from "../classes/wikipedia/Wikipedia";

/** Event triggered when the bot has successfully logged in.
 *  Update bot activity and log some guild info. */
export default async function onReady() {
    // Register commands
    await registerCommands();

    // Update bot activity status
    HaramLeotta.get().updatePresence();

    // Before finalizing deployment, connect to the database
    await MongooseConfig.initialize();

    // Initialize Wikipedia languages
    await Wikipedia.intialize();
    
    // Retrieve list of guilds the bot is in
    const guilds = HaramLeotta.get().guilds.cache;

    // Print guilds number and names
    Logger.info(`Currently in ${guilds.size} servers`);
    //for(const [_, guild] of guilds) Logger.trace(`- ${guild.name}`);

    Logger.info(`========= Deployment completed =========`);
}