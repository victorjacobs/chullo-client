import * as fs from 'fs';
import * as chokidar from 'chokidar';
import * as request from 'superagent';
import {Promise} from 'es6-promise';
import * as ProgressBar from 'progress';
import {Clipboard} from './clipboard';

export class Chullo {
    // TODO more properly check responses from api (through status codes)
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

    watch(directory: string, pattern?: string, removeAfterUpload?: boolean): void {
        let watchPattern = directory;
        if (pattern) {
            watchPattern += '/' + pattern;
        }

        let watcher = chokidar.watch(watchPattern, {
            ignoreInitial: true,
            awaitWriteFinish: true
        });

        watcher.on('add', path => {
            this.upload(directory + '/' + path).then(() => {
                if (removeAfterUpload) {
                    fs.unlinkSync(path);
                }
            });
        })
    }

    upload(file: string): Promise<void> {
        return this.accessToken.then(accessToken => {
            console.log('Starting upload of ' + file);
            // First do a POST to get a unique url to upload to
            return new Promise((resolve, reject) => {
                request
                    .post(this.endpoint + '/files')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .type('json')
                    .send({
                        name: file.split('/').pop()
                    })
                    .end((err, response) => {
                        if (err) {
                            reject('Error posting to files: ' + err);
                        }

                        console.log('File id ' + response.body._id + ' view URL: ' + response.body.viewUrl);
                        Clipboard.copy(response.body.viewUrl);
                        resolve(response);
                    })
                ;
            })
        }).then((response: request.Response) => {
            // Then upload the file
            this.accessToken.then(accessToken => {
                let bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: 100
                });

                request
                    .post(this.endpoint + '/upload/' + response.body._id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('file', file)
                    .on('progress', e => {
                        let progress = Math.round((e.loaded / e.total) * 100);
                        bar.tick(progress);
                    })
                    .end((err, response) => {
                        if (err) {
                            // TODO this reject doesnt work yet apparently
                            return Promise.reject(err);
                        }

                        return response;
                    })
                ;
            });
        }).catch(err => {
            console.log('In catch block ' + err);
        });
    }
}
