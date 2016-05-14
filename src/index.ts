#!/usr/bin/env node
import * as program from 'commander';
import {Client} from './client';
import {Configuration} from './configuration';
import {OAuth} from './oauth';
import * as filesize from 'filesize';

Configuration.read().then(configuration => {
    let oauth = new OAuth(configuration);
    let client = new Client(oauth);

    program
        .version('0.0.1')
    ;

    program
        .command('login <user> <password>')
        .description('Login')
        .action((user, password) => {
            oauth.authenticate(user, password).then((token: any) => {
                configuration.copyFrom(token);
                configuration.write();
                console.log(`Now logged in as ${user}`);
            }, err => {
                console.log(`Login failed: ${err}`);
            });
        })
    ;

    program
        .command('configuration')
        .description('Display the current configuration')
        .action(() => {
            console.log(configuration.asJSON());
        })
    ;

    program
        .command('configure')
        .description('Set configuration values')
        .action(() => {
            configuration.configure();
        })
    ;

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
        .command('password <newPassword>')
        .description('Change the password of currently logged in user')
        .action(newPassword => {
            client.changePassword(newPassword);
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

    program
        .command('status')
        .description('Server status information')
        .action(() => {
            client.status().then(body => {
                console.log(`${configuration.endpoint} currently serving ${body.files} files for a total of ${filesize(body.totalSize)}.`);
            });
        })
    ;

    program.parse(process.argv);
});
