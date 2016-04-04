import * as fs from 'fs';
import * as chokidar from 'chokidar';
import * as request from 'superagent';
import {Promise} from 'es6-promise';
import * as ProgressBar from 'progress';
let Table = require('cli-table');

import {Clipboard} from './clipboard';
import {Configuration} from './configuration';

export class Client {
    constructor(private config: Configuration) { }

    list() {
        request
            .get(`${this.config.endpoint}/files`)
            .set('Authorization', `Bearer ${this.config.accessToken}`)
            .type('json')
            .end((err, response) => {
                var table = new Table({
                    head: ['Id', 'Name', 'Type', 'Uploaded'],
                    colWidths: [30, 30, 30, 30],
                    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
                });

                for (var file of response.body) {
                    table.push([
                        file._id, file.name, file.mime || 'none', file.updatedAt
                    ]);
                }

                console.log(table.toString());
            })
        ;
    }

    delete(id: string) {
        request
            .delete(`${this.config.endpoint}/files/${id}`)
            .set('Authorization', `Bearer ${this.config.accessToken}`)
            .type('json')
            .end((err, response) => {
                if (err || !response.ok) {
                    console.log(`Something went wrong: ${err}`);
                }
            })
        ;
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
        console.log(`Starting upload of ${file}`);
        // First do a POST to get a unique url to upload to
        return (new Promise((resolve, reject) => {
            request
                .post(`${this.config.endpoint}/files`)
                .set('Authorization', `Bearer ${this.config.accessToken}`)
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
        })).then((response: request.Response) => {
            let bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: 100
            });

            request
                .post(`${this.config.endpoint}/upload/${response.body._id}`)
                .set('Authorization', `Bearer ${this.config.accessToken}`)
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
    }
}
