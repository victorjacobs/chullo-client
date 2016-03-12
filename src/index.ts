#!/usr/bin/env node
"use strict";

import * as program from 'commander';
import Chullo = require('./chullo');

let foo = new Chullo();

program
    .version('0.0.1')
    .command('watch <dir>')
    .action((dir) => {
        foo.hello();
    })
    .command('upload <file>')
    .action((file) => {
        console.log('file');
    })
;

program.parse(process.argv);
