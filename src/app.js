const { program } = require('commander');
const S3Client = require('./services/s3');
const chalk = require('chalk');
const os = require('os')
const cliProgress = require('cli-progress');
var minimatch = require("minimatch");

program.version('0.0.1', '-v, --vers', 'Output the current version')
    .requiredOption('--source-bucket <name>', 'Source bucket name')
    .option('--source-access-key-id <key>', 'Source access key id')
    .option('--source-secret-access-key <key>', 'Source secret access key')
    .option('--source-region <region>', 'Source region');

program.option('--pattern <pattern>', 'Glob patter')

program.requiredOption('--output-bucket <name>', 'Output bucket name')
    .option('--output-access-key-id <key>', 'Source access key id')
    .option('--output-secret-access-key <key>', 'Source secret access key')
    .option('--output-region <region>', 'Output region')
    .option('--acl <acl>', 'Access Control List');


module.exports = async () => {
    program.parse(process.argv);
    const multibar = new cliProgress.MultiBar({}, cliProgress.Presets.shades_grey);
    try {
        console.log(chalk.green('Fetching objects list...'));

        const sourceS3Client = new S3Client(program.sourceBucket, {
            ...(program.sourceAccessKeyId && { accessKeyId: program.sourceAccessKeyId }),
            ...(program.sourceSecretAccessKey && { secretAccessKey: program.sourceSecretAccessKey }),
        });
        const outputS3Client = new S3Client(program.outputBucket, {
            ...(program.outputAccessKeyId && { accessKeyId: program.outputAccessKeyId }),
            ...(program.outputSecretAccessKey && { secretAccessKey: program.outputSecretAccessKey }),
        });

        const objectsList = await sourceS3Client.getAllObjects();
        let objectsKeys = objectsList.Contents.map(content => content.Key);

        console.log(chalk.green('Total objects: ' + objectsKeys.length));

        if(program.pattern) {
            objectsKeys = objectsKeys.filter(key => minimatch(key, program.pattern));
            console.log(chalk.green('Matched objects: ' + objectsKeys.length));
        }

        const fetchBar = multibar.create(objectsKeys.length, 0);
        const uploadBar = multibar.create(objectsKeys.length, 0);

        const objectsDataPromise = objectsKeys.map(async (Key) => {
            const data = await sourceS3Client.getObject({
                Key,
            });
            fetchBar.increment(1);
            const result = await outputS3Client.putObject({
                Key,
                Body: data.Body,
                ...(program.acl && { ACL: program.acl }),
            });
            uploadBar.increment(1)
            return result;
        });
        const objectsData = await Promise.all(objectsDataPromise);
    } catch (error) {
        console.log(error);
    } finally {
        multibar.stop();
    }
}
