import async_delay from "../utilities/async_delay";
import LunchReservationPortal, { LunchReservationLunch } from "./portal";

export default class LunchReservation extends LunchReservationPortal {

    constructor() {
        super();
    }

    public async get_favored(hibernate_milliseconds: number): Promise<{date: string, favored: LunchReservationLunch, orders: {choice_data: LunchReservationLunch, choice_selections: number}[]}[]> {
        let portal_choices_old = await this.get_all();
        let portal_choices_new = [] as {date: string, choices: LunchReservationLunch[]}[];
        while (true) {
            await async_delay(hibernate_milliseconds);
            const portal_choices = await this.get_all();
            // two results doesn't match, refetch for data
            if (portal_choices_old.map(date_choices => date_choices.date).join(" ") !== portal_choices.map(date_choices => date_choices.date).join(" ")) {
                portal_choices_old = portal_choices;
                continue;
            }
            // two results does match, continue
            portal_choices_new = portal_choices;
            break;
        }
        const choices_favored: {date: string, favored: LunchReservationLunch, orders: {choice_data: LunchReservationLunch, choice_selections: number}[]}[] = [];
        for (let date_index = 0; date_index < portal_choices_old.length; date_index++) {
            const choice_differences = new Array(portal_choices_old[date_index].choices.length).fill(0).map((zero_lol, choice_index) => {
                const choice_old = portal_choices_old[date_index].choices[choice_index];
                const choice_new = portal_choices_new[date_index].choices[choice_index];
                return {
                    choice_data:       choice_new,
                    choice_selections: choice_old.available - choice_new.available
                };
            }).sort((choice_a, choice_b) => choice_b.choice_selections - choice_a.choice_selections);
            choices_favored.push({date: portal_choices_old[date_index].date, favored: choice_differences[0].choice_data, orders: choice_differences});
        }
        return choices_favored;
    }

}