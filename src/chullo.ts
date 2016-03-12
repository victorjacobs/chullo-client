import * as chokidar from 'chokidar';
import * as request from 'superagent';


class Chullo {
    private oauth;

    constructor() {
        // request.post
    }

    watch(directory: string) {
        let watcher = chokidar.watch(directory);

        watcher.on('ready', () => {
            // Only start watching after initial scan completed
            watcher.on('add', path => {
                this.upload(directory + '/' + path);
            })
        });
    }

    upload(file: string) {
        console.log('uploading ' + file);
    }
}

export = Chullo;
