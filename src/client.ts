import * as fs from 'fs';
import * as chokidar from 'chokidar';
import {Promise} from 'es6-promise';
import * as ProgressBar from 'progress';
let Table = require('cli-table');

import {Clipboard} from './clipboard';
import {OAuth} from './oauth';

export class Client {
    constructor(private oauth: OAuth) { }

    list() {
        return new Promise((resolve, reject) => {
            this.oauth.authenticatedRequest('/files', {
                method: 'GET'
            }).then(body => {
                let table = new Table({
                    head: ['Id', 'Name', 'Type', 'Uploaded'],
                    colWidths: [30, 30, 30, 30],
                    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
                });

                for (var file of body) {
                    table.push([
                        file._id, file.name, file.mime || 'none', file.updatedAt
                    ]);
                }

                console.log(table.toString());
                resolve();
            }, err => {
                reject(err)
            });
        });
    }

    delete(id: string) {
        return new Promise((resolve, reject) => {
            this.oauth.authenticatedRequest(`/files/${id}`, {
                method: 'DELETE'
            }).then(body => {
                resolve();
            }, err => {
                reject(`Something went wrong: ${err}`);
            });
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

    upload(file: string): Promise<string> {
        console.log(`Starting upload of ${file}`);
        return this.oauth.authenticatedRequest('/files', {
            method: 'POST',
            body: {
                name: file.split('/').pop()
            }
        }).then(body => {
            console.log(`File id ${body._id} view URL: ${body.viewUrl}`);
            Clipboard.copy(body.viewUrl);
            return body;
        }).then(body => {
            let bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: 100
            });

            return this.oauth.authenticatedRequest(`/upload/${body._id}`, {
                formData: {
                    file: fs.createReadStream(file)
                },
                method: 'POST'
            }, state => {
                bar.tick(state.percentage);
            })
        });
    }
}
