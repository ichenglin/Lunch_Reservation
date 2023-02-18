import fetch from "node-fetch";

export default class Webhook {

    private webhook_username: string | undefined;
    private webhook_avator:   string | undefined;
    private webhook_url:      string;

    constructor(webhook_url: string) {
        this.webhook_username = undefined;
        this.webhook_avator   = undefined;
        this.webhook_url      = webhook_url;
    }

    set_profile(webhook_username: string, webhook_avator: string): void{
        this.webhook_username = webhook_username;
        this.webhook_avator   = webhook_avator;
    }

    async send(webhook_title: string, webhook_message: string, webhook_color: string, webhook_fields?: {name: string, value: string}[]): Promise<void> {
        const webhook_body = {
            username:   this.webhook_username,
            avatar_url: this.webhook_avator,
            embeds: [{
                color:       parseInt(webhook_color, 16),
                title:       webhook_title,
                description: webhook_message,
                fields:      webhook_fields
            }]
        };
        await fetch(this.webhook_url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(webhook_body)});
    }

}