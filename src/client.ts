import * as fs from 'fs';
import * as child_process from 'child_process';
import * as chokidar from 'chokidar';
import * as ProgressBar from 'progress';
let Table = require('cli-table');
import * as filesize from 'filesize';

import {Clipboard} from './clipboard';
import {OAuth} from './oauth';

export class Client {
    constructor(private oauth: OAuth) { }

    public list() {
        return new Promise((resolve, reject) => {
            this.oauth.authenticatedRequest('/files', {
                method: 'GET',
            }).then(body => {
                let table = new Table({
                    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
                    colWidths: [26, 30, 15, 10],
                    head: ['Id', 'Name', 'Size', 'Accesses'],
                });

                for (let file of body) {
                    file.size = file.size ? filesize(file.size) : 'None';
                    table.push([
                        file._id, file.name, file.size, file.accesses || 'none',
                    ]);
                }

                console.log(table.toString());
                resolve();
            }, err => {
                reject(err);
            });
        });
    }

    public delete(id: string) {
        return new Promise((resolve, reject) => {
            this.oauth.authenticatedRequest(`/files/${id}`, {
                method: 'DELETE',
            }).then(body => {
                resolve();
            }, err => {
                reject(`Something went wrong: ${err}`);
            });
        });
    }

    public watch(directory: string, pattern?: string, removeAfterUpload?: boolean): void {
        let watchPattern = directory;
        if (pattern) {
            watchPattern += '/' + pattern;
        }

        let watcher = chokidar.watch(watchPattern, {
            awaitWriteFinish: true,
            ignoreInitial: true,
        });

        watcher.on('add', path => {
            this.upload(`${directory}/${path}`).then(() => {
                if (removeAfterUpload) {
                    fs.unlinkSync(path);
                }
            });
        });
    }

    public upload(file: string): Promise<void> {
        console.log(`Starting upload of ${file}`);
        return this.oauth.authenticatedRequest('/files', {
            body: {
                name: file.split('/').pop(),
            },
            method: 'POST',
        }).then(body => {
            // TODO might want to move the viewUrl to server side, not sure
            let viewUrl = this.oauth.generateAbsoluteUrl(`/v/${body._id}`);
            console.log(`File id ${body._id} view URL: ${viewUrl}`);
            Clipboard.copy(viewUrl);
            return body;
        }).then(body => {
            let bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                total: 100,
                width: 20,
            });

            return this.oauth.authenticatedRequest(`/upload/${body._id}`, {
                formData: {
                    file: fs.createReadStream(file),
                },
                method: 'POST',
            }, state => {
                bar.tick(state.percentage);
            });
        }).then(() => {
            console.log('Done');
            // Play sound after complete
            child_process.execSync('afplay /System/Library/Sounds/Glass.aiff');
        });
    }

    public changePassword(newPassword: string) {
        return this.oauth.authenticatedRequest('/users/me', {
            body: {
                password: newPassword,
            },
            method: 'PUT',
        });
    }

    public stats(): Promise<any> {
        return this.oauth.authenticatedRequest('/status', {});
    }
}
