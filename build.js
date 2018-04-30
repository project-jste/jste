const fse = require('fs-extra');
const os = require('os');
const inquirer = require('inquirer');
const crypto = require('crypto')
const gzipy = require('gzipy');
const fs = require('fs');
const shell = require('shelljs');
const figlet = require('figlet');
const path = require("path");
const replace = require("replace");
const Datauri = require('datauri').sync;
const ftp = require("basic-ftp")
const isTravis = require('is-travis');
const absolutePath = path.resolve(".");
const algorithm = 'sha1';
async function upload(parent) {
    const client = new ftp.Client()
    try {
        await client.connect(global.ftpAuth.hostname, 21);
        await client.login(global.ftpAuth.username, global.ftpAuth.password);
        await client.useDefaultSettings();
        await client.ensureDir(`htdocs/build/${parent}`)
        await client.uploadDir("build");
    } catch (err) {
        console.log(err)
    }
    client.close()
}
async function startBuild() {
    console.log(' Preparing for building Jste Framework ');
    shell.rm('-rf', 'tmp');
    shell.mkdir('tmp');
    shell.ln('-sf', absolutePath + '/src', 'tmp/src');
    shell.cd('build');
    shell.rm('-rf', '*');
    shell.mkdir('minified', 'compressed');
    fse.copySync(absolutePath + '/src/JS/Core/analyzeCommand-CompilationTemplate.js', absolutePath + '/tmp/analyzeCommand-Compiled.js');
    fse.copySync(absolutePath + '/src/JS/Core/wordsTranslationsInit-CompilationTemplate.js', absolutePath + '/tmp/wordsTranslationsInit-Compiled.js');
    fse.copySync(absolutePath + '/src/Res.html', absolutePath + '/tmp/Res.html');
    fse.copySync(absolutePath + '/src/Res-LiveVersion.html', absolutePath + '/tmp/Res-LiveVersion.html');
    var langCodes = ['en', 'fr', 'ar', 'arz'];
    for (var i = 0; i < langCodes.length; i++) {
        replace({
            regex: langCodes[i].toUpperCase() + "_RIVESCRIPT",
            replacement: Datauri(absolutePath + '/src/JS/Translations/RiveScript/' + langCodes[i] + '.rive'),
            paths: [absolutePath + '/tmp/analyzeCommand-Compiled.js'],
            recursive: true,
            silent: true,
        });
    }
    replace({
        regex: "DICTIONARY_URL",
        replacement: Datauri(absolutePath + '/src/JS/Translations/dictionary.json'),
        paths: [absolutePath + '/tmp/wordsTranslationsInit-Compiled.js'],
        recursive: true,
        silent: true
    });
    replace({
        regex: 'src="(?!http)',
        replacement: 'src="src/',
        paths: [absolutePath + '/tmp/Res.html', absolutePath + '/tmp/Res-LiveVersion.html'],
        recursive: true,
        silent: true
    });
    replace({
        regex: 'href="(?!http)',
        replacement: 'href="src/',
        paths: [absolutePath + '/tmp/Res.html', absolutePath + '/tmp/Res-LiveVersion.html'],
        recursive: true,
        silent: true
    });
    replace({
        regex: 'src/JS/Core/wordsTranslationsInit\.js',
        replacement: 'wordsTranslationsInit-Compiled.js',
        paths: [absolutePath + '/tmp/Res.html', absolutePath + '/tmp/Res-LiveVersion.html'],
        recursive: true,
        silent: true
    });
    replace({
        regex: 'src/JS/Core/analyzeCommand\.js',
        replacement: 'analyzeCommand-Compiled.js',
        paths: [absolutePath + '/tmp/Res.html', absolutePath + '/tmp/Res-LiveVersion.html'],
        recursive: true,
        silent: true
    });
    console.log(' ');
    console.log(' Starting building Jste Framework ');
    var frameworkMinifiedFileInfo = {};
    var frameworkCompressedFileInfo = {};
    console.log(' Bundling the framework files into one HTML file ');
    shell.exec('polymer-bundler -r ' + absolutePath + '/tmp Res.html  --strip-comments --inline-scripts --inline-css --rewrite-urls-in-templates > framework.html');
    console.log(' Minifying the framework bundled file ');
    shell.exec('html-minifier framework.html --remove-comments --minify-css --minify-js --remove-comments --use-short-doctype > minified/framework.min.html');
    frameworkMinifiedFileInfo.size = fs.statSync('minified/framework.min.html').size;
    frameworkCompressedFileInfo.size = frameworkMinifiedFileInfo.size;
    console.log(' Hashing the framework minified file ');
    var shasum = crypto.createHash(algorithm);
    shasum.update(fs.readFileSync('minified/framework.min.html', 'utf8'));
    frameworkMinifiedFileInfo.sha1 = shasum.digest('hex');
    fs.writeFileSync('minified/framework.info.json', JSON.stringify(frameworkMinifiedFileInfo));
    shell.rm('-rf', 'framework.html');
    console.log(' Compresssing the framework minified file ');
    gzipy.compress('minified/framework.min.html', 'compressed/framework.min.html.gz', function (error) {
        console.log(' Hashing the framework compressed file ');
        var shasum = crypto.createHash(algorithm);
        shasum.update(fs.readFileSync('compressed/framework.min.html.gz', 'utf8'));
        frameworkCompressedFileInfo.sha1 = shasum.digest('hex');
        fs.writeFileSync('compressed/framework.info.json', JSON.stringify(frameworkCompressedFileInfo));
        console.log(' Jste Framework has been built properly ;) ');
        console.log(' ');
        console.log(' Starting building Jste Framework Live Version ');
        var frameworkLiveVersionMinifiedFileInfo = {};
        var frameworkLiveVersionCompressedFileInfo = {};
        console.log(' Bundling the framework files into one HTML file ');
        shell.exec('polymer-bundler -r ' + absolutePath + '/tmp Res-LiveVersion.html  --strip-comments --inline-scripts --inline-css --rewrite-urls-in-templates > framework-LiveVersion.html');
        console.log(' Minifying the framework bundled file ');
        shell.exec('html-minifier framework-LiveVersion.html --remove-comments --minify-css --minify-js --remove-comments --use-short-doctype > minified/framework-LiveVersion.min.html');
        frameworkLiveVersionMinifiedFileInfo.size = fs.statSync('minified/framework-LiveVersion.min.html').size;
        frameworkLiveVersionCompressedFileInfo.size = frameworkLiveVersionMinifiedFileInfo.size;
        console.log(' Hashing the framework minified file ');
        var shasum = crypto.createHash(algorithm);
        shasum.update(fs.readFileSync('minified/framework-LiveVersion.min.html', 'utf8'));
        frameworkLiveVersionMinifiedFileInfo.sha1 = shasum.digest('hex');
        fs.writeFileSync('minified/framework-LiveVersion.info.json', JSON.stringify(frameworkLiveVersionMinifiedFileInfo));
        shell.rm('-rf', 'framework-LiveVersion.html');
        console.log(' Compresssing the framework minified file ');
        gzipy.compress('minified/framework-LiveVersion.min.html', 'compressed/framework-LiveVersion.min.html.gz', function (error) {
            console.log(' Hashing the framework compressed file ');
            var shasum = crypto.createHash(algorithm);
            shasum.update(fs.readFileSync('compressed/framework-LiveVersion.min.html.gz', 'utf8'));
            frameworkLiveVersionCompressedFileInfo.sha1 = shasum.digest('hex');
            fs.writeFileSync('compressed/framework-LiveVersion.info.json', JSON.stringify(frameworkLiveVersionCompressedFileInfo));
            console.log(' Jste Framework Live Version has been built properly ;) ');
            console.log(' ');
            console.log(' Starting building the BLOB DB Manager for Jste Framework Live Version ');
            var dbManagerMinifiedFileInfo = {};
            var dbManagerCompressedFileInfo = {};
            console.log(' Minifying the BLOB DB Manager file ');
            shell.exec('html-minifier ../utils/db-manager.html --remove-comments --minify-css --minify-js --remove-comments --use-short-doctype > minified/db-manager.min.html');
            dbManagerMinifiedFileInfo.size = fs.statSync('minified/db-manager.min.html').size;
            dbManagerCompressedFileInfo.size = dbManagerMinifiedFileInfo.size;
            console.log(' Hashing the BLOB DB Manager minified file ');
            var shasum = crypto.createHash(algorithm);
            shasum.update(fs.readFileSync('minified/db-manager.min.html', 'utf8'));
            dbManagerMinifiedFileInfo.sha1 = shasum.digest('hex');
            fs.writeFileSync('minified/db-manager.info.json', JSON.stringify(dbManagerMinifiedFileInfo));
            shell.rm('-rf', 'db-manager.html');
            console.log(' Compresssing the BLOB DB Manager minified file ');
            gzipy.compress('minified/db-manager.min.html', 'compressed/db-manager.min.html.gz', function (error) {
                console.log(' Hashing the BLOB DB Manager compressed file ');
                var shasum = crypto.createHash(algorithm);
                shasum.update(fs.readFileSync('compressed/db-manager.min.html.gz', 'utf8'));
                dbManagerCompressedFileInfo.sha1 = shasum.digest('hex');
                fs.writeFileSync('compressed/db-manager.info.json', JSON.stringify(dbManagerCompressedFileInfo));
                console.log(' The BLOB DB Manager for Jste Framework Live Version has been built properly ;) ');
                shell.cd('../');
                shell.rm('-rf', 'tmp');
                if (global.gitURLPrefix) {
                    console.log(' ');
                    console.log(' Updating the index ');
                    shell.exec('git add .');
                    console.log(' ');
                    console.log(' Recording the change to the local repo ');
                    shell.exec('git commit -m "' + global.commitMessage + '"');
                    console.log(' ');
                    console.log(' Pushing the updates to GitHub ');
                    shell.exec('git push ' + gitURLPrefix + 'framework.git master');
                    console.log(' ');
                    console.log(' Uploading built framework files ');
                    upload('framework');
                }
/*                 if (shell.test('-d', '../manager')) {
                    console.log(' ');
                    console.log(' Preparing for building Jste Manager ');
                    shell.cd('../manager');
                    console.log(' ');
                    console.log(' Updating framework file ');
                    shell.cp('../framework/build/compressed/framework.min.html.gz', 'src/assets');
                    console.log(' ');
                    console.log(' Starting building Jste Manager ');
                    shell.exec('node build');
                    if (global.gitURLPrefix) {
                        console.log(' ');
                        console.log(' Updating the index ');
                        shell.exec('git add .');
                        console.log(' ');
                        console.log(' Recording the change to the local repo ');
                        shell.exec('git commit -m "Updating Framework Files"');
                        console.log(' ');
                        console.log(' Pushing the updates to GitHub ');
                        shell.exec('git push ' + gitURLPrefix + 'manager.git master');
                        console.log(' ');
                        console.log(' Uploading built Jste Manager files ');
                        upload('manager');
                    }
                }
                if (shell.test('-d', '../manager-cloud')) {
                    console.log(' ');
                    console.log(' Preparing for building Jste Manager Heroku version ');
                    shell.cd('../manager-cloud');
                    console.log(' ');
                    console.log(' Updating framework file ');
                    shell.cp(['../framework/build/compressed/framework-LiveVersion.min.html.gz', '../framework/build/compressed/db-manager.min.html.gz'], 'assets');
                    if (global.gitURLPrefix) {
                        console.log(' ');
                        console.log(' Updating the index ');
                        shell.exec('git add .');
                        console.log(' ');
                        console.log(' Recording the change to the local repo ');
                        shell.exec('git commit -m "Updating Framework Files"');
                        console.log(' ');
                        console.log(' Pushing the updates to GitHub ');
                        shell.exec('git push ' + gitURLPrefix + 'manager-cloud.git master');
                    }
                }
                if (shell.test('-d', '../manager-phone')) {
                    console.log(' ');
                    console.log(' Preparing for building Jste Manager phone version ');
                    shell.cd('../manager-phone/src');
                    console.log(' ');
                    console.log(' Updating framework file ');
                    shell.cp('../../framework/build/minified/framework.min.html', 'www/jxcore/assets');
                    console.log(' ');
                    console.log(' Starting building Jste Manager phone version ');
                    shell.exec('cordova build');
                    shell.cd('../');
                    shell.cp('src/platforms/android/build/outputs/apk/debug/android-debug.apk', 'build');
                    if (global.gitURLPrefix) {
                        console.log(' ');
                        console.log(' Updating the index ');
                        shell.exec('git add .');
                        console.log(' ');
                        console.log(' Recording the change to the local repo ');
                        shell.exec('git commit -m "Updating Framework Files"');
                        console.log(' ');
                        console.log(' Pushing the updates to GitHub ');
                        shell.exec('git push ' + gitURLPrefix + 'manager-phone.git master');
                        console.log(' ');
                        console.log(' Uploading built Jste Manager phone version files ');
                        upload('manager-phone');
                    }
                } */
            });
        });
    });
}

figlet('JSTE FRAMEWORK', function (err, data) {
    console.log(data);
    console.log('');
    console.log(' Welcome to Jste Framework builder :) ');
    if (isTravis) {
        startBuild();
    } else {
        inquirer
            .prompt([{
                type: 'confirm',
                name: 'deploy',
                message: 'Do you want to deploy this build ?'
            }])
            .then(options => {
                if (options.deploy == true) {
                    inquirer
                        .prompt([{
                                type: 'input',
                                name: 'commit_message',
                                message: 'Please enter the commit message '
                            }, {
                                type: 'input',
                                name: 'git_username',
                                message: 'Please enter your GitHub username '
                            },
                            {
                                type: 'password',
                                name: 'git_password',
                                mask: '*',
                                message: 'Please enter your GitHub password '
                            },
                            {
                                type: 'input',
                                name: 'ftp_hostname',
                                message: 'Please enter your FTP hostname '
                            },
                            {
                                type: 'input',
                                name: 'ftp_username',
                                message: 'Please enter your FTP username '
                            },
                            {
                                type: 'password',
                                name: 'ftp_password',
                                mask: '*',
                                message: 'Please enter your FTP password '
                            }
                        ]).then(deploy_info => {
                            global.gitURLPrefix = 'https://' + deploy_info.git_username + ':' + deploy_info.git_password + '@github.com/project-jste/';
                            global.ftpAuth = {
                                hostname: deploy_info.ftp_hostname,
                                username: deploy_info.ftp_username,
                                password: deploy_info.ftp_password,
                            };
                            global.commitMessage = deploy_info.commit_message;
                            startBuild();
                        })
                } else {
                    startBuild();
                }
            });
    }
});