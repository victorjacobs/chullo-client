import * as fs from 'fs';

let osenv = require('osenv');
let prompt = require('prompt');

export class Configuration {
    private clientId: string;
    private clientSecret: string;
    private endpoint: string;
    private accessToken: string;
    private refreshToken: string;

    constructor() {
        this.read();
    }

    private read() {
        if (!fs.accessSync(this.path())) {
            this.configure();
        } else {
            let data = JSON.parse(fs.readFileSync(this.path(), 'utf8'));
            this.clientId = data.clientId;
            this.clientSecret = data.clientSecret;
            this.endpoint = data.endpoint;
            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
        }
    }

    private write() {
        fs.writeFileSync(this.path(), this.asJSON(), 'utf8');
    }

    configure() {
        prompt.message = '';
        prompt.start();

        let schema = {
            properties: {
                clientId: {
                    default: 'test'
                }
            }
        }

        prompt.get(schema, (err, result) => {
            console.log(result);
        });
    }

    path(): string {
        return `${osenv.home()}/.chullorc`;
    }

    asArray(): Array<string> {
        return [];
    }

    asJSON(): any {
        return JSON.stringify({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            endpoint: this.endpoint,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken
        });
    }
}
