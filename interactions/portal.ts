import fetch from "node-fetch";
import * as cheerio from "cheerio";
import Cookies from "../utilities/cookies";

export default class LunchReservationPortal {

    private portal_cookies: Cookies;

    constructor() {
        this.portal_cookies = new Cookies();
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
        const day_html          = await fetch(`https://pos.kcis.ntpc.edu.tw/Order.aspx?DT=${day_date}`, {headers: {"cookie": this.portal_cookies.export_all()}}).then(response => response.text());
        const day_menu          = cheerio.load(day_html);
        const choice_titles     = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > h3");
        const choice_calories   = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > p");
        const choice_availables = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > input[type=button]");
        const choice_selections = day_menu("#fh5co-main > div > div > div.col-md-8.col-md-push-4 > input[type=submit]");
        const day_choices: LunchReservationLunch[] = [];
        for (let item_index = 0; item_index < choice_titles.length; item_index++) {
            const item_title     = (choice_titles   .get(item_index)    ?.children[2] as any).data as string;
            const item_calorie   = (choice_calories .get(item_index + 1)?.children[0] as any).data as string;
            const item_available = choice_availables.get(item_index)    ?.attribs.value            as string;
            const item_selection = choice_selections.get(item_index)    ?.attribs.onclick          as string;
            day_choices.push({
                id:        parseInt((item_selection.match(/^window\.location\.href = 'OrderApply\.aspx\?UID=(\d{5})/) as RegExpMatchArray)[1]),
                name:      item_title,
                calorie:   parseInt((item_calorie.match(/熱量：(\d+)大卡/) as RegExpMatchArray)[1]),
                available: (item_available === "無限量") ? Infinity : parseInt((item_available.match(/^可選量：(\d+)$/) as RegExpMatchArray)[1])
            });
        }
        return day_choices;
    }

}

export interface LunchReservationLoginCredentials {
    username: string,
    password: string
}

export interface LunchReservationLunch {
    id:        number,
    name:      string,
    calorie:   number,
    available: number
}
