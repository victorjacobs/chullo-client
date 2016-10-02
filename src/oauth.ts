import { Configuration } from './configuration';
import * as request from 'request';
let progress = require('request-progress');

export class OAuth {
    constructor(private config: Configuration) {}

    public authenticate(username: string, password: string): Promise<Object>;
    public authenticate(refreshToken: string): Promise<Object>;
    public authenticate(refreshTokenOrUsername: string, password?: string): Promise<any> {
        let payload = {};
        if (password === undefined) {
            payload = {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshTokenOrUsername,
            };
        } else {
            payload = {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'password',
                password: password,
                username: refreshTokenOrUsername,
            };
        }

        return new Promise((resolve, reject) => {
            request({
                form: payload,
                json: true,
                method: 'POST',
                url: `${this.config.endpoint}/oauth/token`,
            }, (err, response, body) => {
                if (err) return reject(err);
                if (response.statusCode !== 200) return reject(body.error_description);

                resolve({
                    accessToken: body.access_token,
                    refreshToken: body.refresh_token,
                });
            });
        });
    }

    public generateAbsoluteUrl(relative: string) {
        return `${this.config.endpoint}${relative}`;
    }

    public authenticatedRequest(url, requestConfig, onProgress?): Promise<any> {
        let enrichRequestConfigWithToken = config => {
            return Object.assign({}, config, {
                auth: {
                    bearer: this.config.accessToken,
                },
                json: true,
                url: `${this.config.endpoint}${url}`,
            });
        };

        return new Promise((resolve, reject) => {
            if (!this.config.accessToken || !this.config.refreshToken) {
                console.log('Log in first before doing anything else');
                return reject();
            }

            progress(request(enrichRequestConfigWithToken(requestConfig), (err, response, body) => {
                if (response.statusCode === 401) {
                    // If we get unauthorized, try to refresh the token and try again
                    return this.authenticate(this.config.refreshToken).then(token => {
                        this.config.copyFrom(token);
                        this.config.write();

                        progress(request(enrichRequestConfigWithToken(requestConfig), (err, response, body) => {
                            if (err) return reject(err);

                            // TODO might pass entire response here too
                            resolve(body);
                        })).on('progress', onProgress || function(){});
                    }, err => {
                        reject(err);
                    });
                }

                if (err) reject(err);

                resolve(body);
            })).on('progress', onProgress || function() {});
        });
    }
}
