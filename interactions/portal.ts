import fetch from "node-fetch";
import * as cheerio from "cheerio";
import Cookies from "../utilities/cookies";

export default class LunchReservationPortal {

    private portal_credentials: LunchReservationLoginCredentials | undefined;
    private portal_cookies:     Cookies;

    constructor() {
        this.portal_credentials = undefined;
        this.portal_cookies     = new Cookies();
    }

    async login(user_credentials: LunchReservationLoginCredentials): Promise<void> {
        // prefetch for viewstate credentials
        const prefetch_response = await fetch("https://pos.kcis.ntpc.edu.tw/Default.aspx");
        const viewstate_form = cheerio.load(await prefetch_response.text())("#ctl00");
        this.portal_cookies.import_set_cookie(prefetch_response.headers.get("set-cookie") as string);
        // login with viewstate & login credentials
        const login_credentials = {
            __VIEWSTATE:          viewstate_form.find("input#__VIEWSTATE").val()          as string,
            __VIEWSTATEGENERATOR: viewstate_form.find("input#__VIEWSTATEGENERATOR").val() as string,
            __EVENTVALIDATION:    viewstate_form.find("input#__EVENTVALIDATION").val()    as string,
            acc:                  user_credentials.username,
            pwd:                  user_credentials.password,
            sub:                  "登入/Login"
        };
        const login_request = await fetch("https://pos.kcis.ntpc.edu.tw/Default.aspx", {method: "POST", redirect: "manual", headers: {"cookie": this.portal_cookies.export_all()}, body: new URLSearchParams(login_credentials)});
        this.portal_cookies.import_set_cookie(login_request.headers.get("set-cookie") as string);
        await fetch("https://pos.kcis.ntpc.edu.tw/CheckOrder.aspx?login=Y", {headers: {"cookie": this.portal_cookies.export_all()}});
        this.portal_credentials = user_credentials;
    }

    async login_last_session(): Promise<void> {
        if (this.portal_credentials === undefined) return;
        await this.login(this.portal_credentials);
    }

    async get_dates(): Promise<string[]> {
        const portal_html = await fetch("https://pos.kcis.ntpc.edu.tw/CheckOrder.aspx", {headers: {"cookie": this.portal_cookies.export_all()}}).then(response => response.text());
        const portal_items = cheerio.load(portal_html)("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > h3");
        const portal_dates: string[] = [];
        for (let date_index = 0; date_index < portal_items.length; date_index++) {
            const loop_date = (portal_items.get(date_index)?.firstChild as any).data;
            portal_dates.push(loop_date.match(/^(\d{4}\/\d{2}\/\d{2})/)[1]);
        }
        return portal_dates;
    }

    async get_choices(day_date: string): Promise<LunchReservationLunch[]> {
        const day_html        = await fetch(`https://pos.kcis.ntpc.edu.tw/Order.aspx?DT=${day_date}`, {headers: {"cookie": this.portal_cookies.export_all()}}).then(response => response.text());
        const day_menu        = cheerio.load(day_html);
        const choice_titles   = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > h3");
        const choice_calories = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > p");
        const choice_labels   = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > input");
        const day_choices: LunchReservationLunch[] = [];
        for (let item_index = 0; item_index < choice_titles.length; item_index++) {
            const item_title     = (choice_titles   .get(item_index)        ?.children[2] as any).data as string;
            const item_calorie   = (choice_calories .get(item_index + 1)    ?.children[0] as any).data as string;
            let   item_available = choice_labels    .get(item_index * 2)    ?.attribs.value            as string | number;
            const item_selection = choice_labels    .get(item_index * 2 + 1)?.attribs.onclick          as string;
            if (item_available === "無限量")            item_available = Infinity;
            if (item_available === "已額滿/No Vacancy") item_available = 0;
            day_choices.push({
                id:        (item_selection.match(/^window\.location\.href = 'OrderApply\.aspx\?UID=(\d{5})/) as RegExpMatchArray)[1],
                name:      item_title,
                calorie:   parseInt((item_calorie.match(/熱量：(\d+)大卡/) as RegExpMatchArray)[1]),
                available: (typeof(item_available) === "number") ? item_available : parseInt((item_available.match(/^可選量：(\d+)$/) as RegExpMatchArray)[1])
            });
        }
        return day_choices;
    }

    async get_all(): Promise<{date: string, choices: LunchReservationLunch[]}[]> {
        const portal_dates = await this.get_dates();
        const portal_choices: (Promise<LunchReservationLunch[]> | LunchReservationLunch[])[] = [];
        for (let date_index = 0; date_index < portal_dates.length; date_index++) {
            const loop_date = portal_dates[date_index];
            portal_choices.push(this.get_choices(loop_date));
        }
        await Promise.all(portal_choices);
        for (let date_index = 0; date_index < portal_dates.length; date_index++) await (portal_choices[date_index] as Promise<LunchReservationLunch[]>).then(date_choices => portal_choices[date_index] = date_choices);
        return portal_choices.map((choices_content, date_index) => ({date: portal_dates[date_index], choices: choices_content as unknown as LunchReservationLunch[]})).filter(choices_result => choices_result.choices.length > 0);
    }
}

export interface LunchReservationLoginCredentials {
    username: string,
    password: string
}

export interface LunchReservationLunch {
    id:        string,
    name:      string,
    calorie:   number,
    available: number
}
