export default class Cookies {

    private cookie_list = new Map<string, string>;

    constructor() {}

    set(cookie_key: string, cookie_value: string): void {
        this.cookie_list.set(cookie_key, cookie_value);
    }

    import_set_cookie(set_cookie_string: string): void {
        const set_cookie_strings = set_cookie_string.split(/HttpOnly,\s*/g);
        for (let set_cookie_index = 0; set_cookie_index < set_cookie_strings.length; set_cookie_index++) {
            const set_cookie_parameters = set_cookie_strings[set_cookie_index].match(/^([^=]+)=([\w\d]+);/);
            if (set_cookie_parameters === null || set_cookie_parameters[1] === null || set_cookie_parameters[2] === null) continue;
            this.cookie_list.set(set_cookie_parameters[1], set_cookie_parameters[2]);
        }
    }

    get(cookie_key: string): string | undefined {
        return this.cookie_list.get(cookie_key);
    }

    export_all(): string {
        const cookie_strings: string[] = [];
        this.cookie_list.forEach((cookie_value: string, cookie_key: string) => cookie_strings.push(`${cookie_key}=${cookie_value}`));
        return cookie_strings.join("; ");
    }

}