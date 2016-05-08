import {Promise} from 'es6-promise';
import {Configuration} from './configuration';
import * as request from 'request';
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
                if (!err) {
                    resolve({
                        accessToken: body.access_token,
                        refreshToken: body.refresh_token
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

    authenticatedRequest(url, requestConfig, cb) {
        let enrichRequestConfigWithToken = (requestConfig) => {
            return objectAssign({}, requestConfig, {
                url: `${this.config.endpoint}${url}`,
                auth: {
                    bearer: this.config.accessToken
                },
                json: true
            });
        }

        // TODO maybe do this with promises
        request(enrichRequestConfigWithToken(requestConfig), (err, response, body) => {
            if (response.statusCode == 401) {
                // If we get unauthorized, try to refresh the token and try again
                return this.authenticate(this.config.refreshToken).then(token => {
                    this.config.copyFrom(token);
                    this.config.write();

                    request(enrichRequestConfigWithToken(requestConfig), cb);
                }, err => {
                    console.log(err);
                });
            }

            return cb(err, response, body);
        });
    }
}
