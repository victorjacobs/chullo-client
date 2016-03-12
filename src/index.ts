#!/usr/bin/env node
import * as program from 'commander';
import Chullo = require('./chullo');

let client = new Chullo();

program
    .version('0.0.1')
    .command('watch <dir>')
    .action((dir) => {
        client.watch(dir);
    })
    .command('upload <file>')
    .action((file) => {
        console.log('file');
    })
;

program.parse(process.argv);
