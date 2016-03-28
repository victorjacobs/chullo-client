import * as fs from 'fs';
import * as chokidar from 'chokidar';
import * as request from 'superagent';
import {Promise} from 'es6-promise';
import * as ProgressBar from 'progress';
let Table = require('cli-table');

import {Clipboard} from './clipboard';
import {OAuth} from './oauth';

export class Client {
    // TODO more properly check responses from api (through status codes)
    // TODO factor these out to environment-dependent things
    private token: Promise<any>;
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
        let oauth = new OAuth(this.clientId, this.clientSecret, this.endpoint);
        this.token = oauth.authenticate(username, password);
    }

    list() {
        this.token.then(token => {
            request
                .get(`${this.endpoint}/files`)
                .set('Authorization', `Bearer ${token.access_token}`)
                .type('json')
                .end((err, response) => {
                    var table = new Table({
                        head: ['Id', 'Name', 'Type', 'Uploaded'],
                        colWidths: [30, 30, 30, 30],
                        chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''}
                    });

                    for (var file of response.body) {
                        table.push([
                            file._id, file.name, file.mime || 'none', file.updatedAt
                        ]);
                    }

                    console.log(table.toString());
                })
        });
    }

    delete(id: string) {
        this.token.then(token => {
            request
                .delete(`${this.endpoint}/files/${id}`)
                .set('Authorization', `Bearer ${token.access_token}`)
                .type('json')
                .end((err, response) => {
                    if (err || !response.ok) {
                        console.log(`Something went wrong: ${err}`);
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
            this.upload(`${directory}/${path}`).then(() => {
                if (removeAfterUpload) {
                    fs.unlinkSync(path);
                }
            });
        })
    }

    upload(file: string): Promise<void> {
        return this.token.then(token => {
            console.log(`Starting upload of ${file}`);
            // First do a POST to get a unique url to upload to
            return new Promise((resolve, reject) => {
                request
                    .post(`${this.endpoint}/files`)
                    .set('Authorization', `Bearer ${token.access_token}`)
                    .type('json')
                    .send({
                        name: file.split('/').pop()
                    })
                    .end((err, response) => {
                        if (err) {
                            reject(`Error posting to files: ${err}`);
                        }

                        console.log(`File id ${response.body._id} view URL: ${response.body.viewUrl}`);
                        Clipboard.copy(response.body.viewUrl);
                        resolve(response);
                    })
                ;
            })
        }).then((response: request.Response) => {
            // Then upload the file
            this.token.then(token => {
                let bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: 100
                });

                request
                    .post(`${this.endpoint}/upload/${response.body._id}`)
                    .set('Authorization', `Bearer ${token.access_token}`)
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
            console.log(`In catch block ${err}`);
        });
    }
}
