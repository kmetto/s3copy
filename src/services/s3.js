const AWS = require('aws-sdk');
const util = require('util');

module.exports = class S3Client {
    constructor(bucket, options = {}){
        this.bucket = bucket;
        this.options = options;
        this.client = new AWS.S3(this.options)
    }

    getAllObjects(options){
        return util.promisify(this.client.listObjects).call(this.client, { Bucket: this.bucket, ...options});
    }

    getObject(options){
        return util.promisify(this.client.getObject).call(this.client, { Bucket: this.bucket, ...options});
    }

    putObject(options){
        return util.promisify(this.client.putObject).call(this.client, { Bucket: this.bucket, ...options});
    }
}
