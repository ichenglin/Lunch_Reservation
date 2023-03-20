import * as dotenv from "dotenv";
import Webhook from "./utilities/webhook";
import async_delay from "./utilities/async_delay";
import LunchReservation from "./interactions/reservation";

import * as automation_settings from "./data/automation_settings.json";

dotenv.config();

(async () => {
    // login
    const portal  = new LunchReservation();
    const webhook = new Webhook(process.env.WEBHOOK_URL as string);
    await portal.login({
        username: process.env.PORTAL_USERNAME as string,
        password: process.env.PORTAL_PASSWORD as string
    });
    webhook.set_profile(
        process.env.WEBHOOK_USERNAME as string,
        process.env.WEBHOOK_AVATOR   as string
    );
    // check for FOODS!
    while (true) {
        await lunch_reservation(portal, webhook);
        await async_delay(1000 * 60 * 60 * 24);
    }
})();

async function lunch_reservation(portal: LunchReservation, webhook: Webhook): Promise<void> {
    // public preference scan
    webhook.send("Public Preference Scan Startup", `Begin scanning for public preference, ending in ${Math.ceil(automation_settings.scanner.hibernate / (1000 * 60))} minute(s).`, "F43F5E");
    const public_favored = await portal.get_favored(automation_settings.scanner.hibernate);
    webhook.send("Public Preference Scan Completed", `The public preference scan has completed.`, "84CC16", public_favored.map(date_favored => ({
        name:  date_favored.date,
        value: `\`${date_favored.favored.name}\` (Available: \`${date_favored.favored.available}\`)`
    })));
}