import * as request from 'superagent';
import {Promise} from 'es6-promise';

export class OAuth {
    constructor(private clientId: string, private clientSecret: string, private endpoint: string) {}

    authenticate(username: string, password: string): Promise<Object>;
    authenticate(refreshToken: string): Promise<Object>;
    authenticate(refreshTokenOrUsername: string, password?: string): Promise<Object> {
        let payload = {};
        if (password === undefined) {
            payload = {
                grant_type: 'refresh_token',
                token: refreshTokenOrUsername,
                client_id: this.clientId,
                client_secret: this.clientSecret
            };
        } else {
            payload = {
                grant_type: 'password',
                username: refreshTokenOrUsername,
                password: password,
                client_id: this.clientId,
                client_secret: this.clientSecret
            };
        }

        return new Promise((resolve, reject) => {
            request
                .post(`${this.endpoint}/oauth/token`)
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
