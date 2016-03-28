#!/usr/bin/env node
import * as program from 'commander';
import {Client} from './client';
import {Configuration} from './configuration';

let client = new Client();

program
    .version('0.0.1')

program
    .command('watch <dir>')
    .description('Watch a directory for new files')
    .option('-i, --include <pattern>', 'Filter files to upload according to pattern')
    .option('-r, --remove-after-upload', 'Remove local file after upload')
    .action((dir, options) => {
        client.watch(dir, options.include, options.removeAfterUpload);
    })
;

program
    .command('upload <file>')
    .description('Upload a single file')
    .action(file => {
        client.upload(file);
    })
;

program
    .command('list')
    .description('List all files uploaded')
    .action(() => {
        client.list();
    })
;

program
    .command('delete <id>')
    .description('Deletes given file')
    .action(id => {
        client.delete(id);
    })
;

program.parse(process.argv);
