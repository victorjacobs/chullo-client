import * as fs from 'fs';
import {Promise} from 'es6-promise';

let osenv = require('osenv');
let prompt = require('prompt');

export class Configuration {
    public static path(): string {
        return `${osenv.home()}/.chullorc`;
    }

    public static read(): Promise<Configuration> {
        let config = new Configuration();
        // TODO do a check here for oauth client params exist
        if (!config.exists()) {
            return config.configure();
        } else {
            let data = {};
            try {
                data = JSON.parse(fs.readFileSync(Configuration.path(), 'utf8'));
            } catch (e) {
                return config.configure();
            }

            config.copyFrom(data);
            return Promise.resolve(config);
        }
    }

    public static switchEnvironment(fromEnv: string, toEnv: string): Promise<Configuration> {
        let fromConfig = `${Configuration.path()}.${fromEnv}`;
        let toConfig = `${Configuration.path()}.${toEnv}`;

        try {
            fs.accessSync(toConfig);
        } catch (e) {
            return Configuration.read();
        }

        fs.renameSync(Configuration.path(), fromConfig);
        fs.renameSync(toConfig, Configuration.path());

        return Configuration.read();
    }

    public clientId: string;
    public clientSecret: string;
    public endpoint: string;
    public accessToken: string;
    public refreshToken: string;

    public write() {
        fs.writeFileSync(Configuration.path(), this.asJSON(), 'utf8');
    }

    public configure(): Promise<Configuration> {
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

    public copyFrom(obj: any) {
        this.clientId = obj.clientId || this.clientId;
        this.clientSecret = obj.clientSecret || this.clientSecret;
        this.endpoint = obj.endpoint || this.endpoint;
        this.accessToken = obj.accessToken || this.accessToken;
        this.refreshToken = obj.refreshToken || this.refreshToken;
    }

    public asJSON(): any {
        return JSON.stringify({
            accessToken: this.accessToken,
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            endpoint: this.endpoint,
            refreshToken: this.refreshToken,
        });
    }

    // Because node doesnt have a proper exists method
    private exists() {
        try {
            fs.accessSync(Configuration.path());
        } catch (e) {
            return false;
        }

        return true;
    }

    private oauthParamsMissing() {
        return !this.clientId || !this.clientSecret || !this.endpoint;
    }
}
