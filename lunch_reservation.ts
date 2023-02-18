import * as FileSystem from "fs";
import * as dotenv from "dotenv";
import LunchReservationPortal from "./interactions/portal";
import Webhook from "./utilities/webhook";
import async_delay from "./utilities/async_delay";

dotenv.config();

(async () => {
    // login
    const portal  = new LunchReservationPortal();
    const webhook = new Webhook(process.env.WEBHOOK_URL as string);
    await portal.login({username: process.env.PORTAL_USERNAME as string, password: process.env.PORTAL_PASSWORD as string});
    webhook.set_profile(process.env.WEBHOOK_USERNAME as string, process.env.WEBHOOK_AVATOR as string);
    // check for FOODS!
    while (true) {
        const portal_dates = await portal.get_all();
        webhook.send("Initialize Completed", "The initial scan has completed, result are as the following.", "FF0000", portal_dates.filter(date_data => date_data.choices.length > 0).map(date_data => ({name: date_data.date, value: date_data.choices.map(choice => choice.name).join("\n")})));
        await async_delay(1000 * 60 * 60);
    }
})();