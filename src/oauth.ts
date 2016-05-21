import {Promise} from 'es6-promise';
import {Configuration} from './configuration';
import * as request from 'request';
var progress = require('request-progress');
let objectAssign = require('object-assign');

export class OAuth {
    constructor(private config: Configuration) {}

    authenticate(username: string, password: string): Promise<Object>;
    authenticate(refreshToken: string): Promise<Object>;
    authenticate(refreshTokenOrUsername: string, password?: string): Promise<any> {
        let payload = {};
        if (password === undefined) {
            payload = {
                grant_type: 'refresh_token',
                refresh_token: refreshTokenOrUsername,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            };
        } else {
            payload = {
                grant_type: 'password',
                username: refreshTokenOrUsername,
                password: password,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            };
        }

        return new Promise((resolve, reject) => {
            request({
                url: `${this.config.endpoint}/oauth/token`,
                method: 'POST',
                form: payload,
                json: true
            }, (err, response, body) => {
                if (err) return reject(err);
                if (response.statusCode != 200) return reject(body.error_description);

                resolve({
                    accessToken: body.access_token,
                    refreshToken: body.refresh_token
                });
            });
        });
    }

    generateAbsoluteUrl(relative: string) {
        return `${this.config.endpoint}${relative}`;
    }

    authenticatedRequest(url, requestConfig, onProgress?): Promise<any> {
        let enrichRequestConfigWithToken = (requestConfig) => {
            return objectAssign({}, requestConfig, {
                url: `${this.config.endpoint}${url}`,
                auth: {
                    bearer: this.config.accessToken
                },
                json: true
            });
        }

        return new Promise((resolve, reject) => {
            if (!this.config.accessToken || !this.config.refreshToken) {
                console.log('Log in first before doing anything else');
                return reject();
            }

            progress(request(enrichRequestConfigWithToken(requestConfig), (err, response, body) => {
                if (response.statusCode == 401) {
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
            })).on('progress', onProgress || function(){});
        });
    }
}
