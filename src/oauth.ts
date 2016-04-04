import * as request from 'superagent';
import {Promise} from 'es6-promise';
import {Configuration} from './configuration';

export class OAuth {
    constructor(private config: Configuration) {}

    authenticate(username: string, password: string): Promise<Object>;
    authenticate(refreshToken: string): Promise<Object>;
    authenticate(refreshTokenOrUsername: string, password?: string): Promise<any> {
        let payload = {};
        if (password === undefined) {
            payload = {
                grant_type: 'refresh_token',
                token: refreshTokenOrUsername,
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
            request
                .post(`${this.config.endpoint}/oauth/token`)
                .type('form')
                .send(payload)
                .end((err, response) => {
                    if (!err) {
                        resolve(response.body);
                    } else {
                        reject(err);
                    }
                })
            ;
        });
    }
}
