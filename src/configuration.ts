import * as fs from 'fs';
import {Promise} from 'es6-promise';

let osenv = require('osenv');
let prompt = require('prompt');

export class Configuration {
    public clientId: string;
    public clientSecret: string;
    public endpoint: string;
    public accessToken: string;
    public refreshToken: string;

    public static read(): Promise<Configuration> {
        let config = new Configuration();
        // TODO do a check here for oauth client params exist
        if (!config.exists()) {
            return config.configure();
        } else {
            let data = JSON.parse(fs.readFileSync(config.path(), 'utf8'));
            config.copyFrom(data);
            return Promise.resolve(config);
        }
    }

    write() {
        fs.writeFileSync(this.path(), this.asJSON(), 'utf8');
    }

    // Because node doesnt have a proper exists method
    private exists() {
        try {
            fs.accessSync(this.path());
        } catch (e) {
            return false;
        }

        return true;
    }

    private oauthParamsMissing() {
        return !this.clientId || !this.clientSecret || !this.endpoint;
    }

    configure(): Promise<Configuration> {
        return new Promise((resolve, reject) => {
            prompt.message = '';
            prompt.start();

            let schema = {
                properties: {
                    clientId: {
                        default: this.clientId
                    },
                    clientSecret: {
                        default: this.clientSecret
                    },
                    endpoint: {
                        default: this.endpoint
                    }
                }
            }

            prompt.get(schema, (err, result) => {
                if (result === undefined) {
                    return;
                }

                this.copyFrom(result);
                this.write();
                resolve(this);
            });
        });
    }

    copyFrom(obj: any) {
        this.clientId = obj.clientId || this.clientId;
        this.clientSecret = obj.clientSecret || this.clientSecret;
        this.endpoint = obj.endpoint || this.endpoint;
        this.accessToken = obj.accessToken || this.accessToken;
        this.refreshToken = obj.refreshToken || this.refreshToken;
    }

    path(): string {
        return `${osenv.home()}/.chullorc`;
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
