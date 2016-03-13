import * as chokidar from 'chokidar';
import * as request from 'superagent';
import {Promise} from 'es6-promise';

class Chullo {
    // TODO factor these out to environment-dependent things
    private accessToken: Promise<string>;
    private clientId: string;
    private clientSecret: string;
    private endpoint: string;

    constructor() {
        this.endpoint = 'http://localhost:3000';
        this.clientId = 'foo';
        this.clientSecret = 'bar';

        this.authenticate('victor@chullo.io', 'test');
    }

    private authenticate(username: string, password: string) {
        this.accessToken = new Promise((resolve, reject) => {
            request
                .post(this.endpoint + '/oauth/token')
                .type('form')
                .send({
                    grant_type: 'password',
                    username: username,
                    password: password,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
                .end((err, response) => {
                    if (!err) {
                        resolve(response.body.access_token);
                    } else {
                        reject(err);
                    }
                })
            ;
        });
    }

    watch(directory: string, pattern?: string, removeAfterUpload?: boolean):void {
        let watchPattern = directory;
        if (pattern) {
            watchPattern += '/' + pattern;
        }

        let watcher = chokidar.watch(watchPattern, {
            ignoreInitial: true,
            awaitWriteFinish: true
        });

        watcher.on('add', path => {
            this.upload(directory + '/' + path);
        })
    }

    upload(file: string) {
        this.accessToken.then(accessToken => {
            console.log('uploading ' + file + ' accessToken ' + accessToken);
            // First do a POST to get a unique url, return it and then
            request
                .post(this.endpoint + '/files')
                .type('json')
                .set('Authorization', 'Bearer ' + accessToken)
                .send({
                    name: file.split('/').pop()
                })
                .end((err, response) => {
                    if (err) {
                        console.log('Error uploading: ' + err);
                        return;
                    }

                    console.log('View URL: ' + response.body);

                    request
                        .post(this.endpoint + '/upload/' + response.body._id)
                        .set('Authorization', 'Bearer ' + accessToken)
                        .attach('file', file)
                        .end((err, response) => {
                            console.log(response.body);
                        })
                    ;
                })
            ;
        });
    }
}

export = Chullo;
