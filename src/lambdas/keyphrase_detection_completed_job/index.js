"use strict";

const aws = require('aws-sdk');
const utils = require("/opt/nodejs/jobrunner/utilities")
const s3Utils = require("/opt/nodejs/jobrunner/s3")


function processKeyPhrases(job, keyphrases) {
  if (keyphrases.KeyPhrases.length == 0) {
    return Promise.resolve(true)
  }

  return new Promise((resolve, reject) => {
    //job.jobId - contains the Comprehend JobId
    console.log("job",job) 
    //sentiment
    // -- Text -- the key phrase found
    // -- Score -- the confidence returned by Comprehend
    console.log("sentiment",keyphrases)
    //TODO: Put your custom logic here to process the results.

  })
}

exports.handler = function(event, context, callback) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  for (let message of event.Records) {

    let body = JSON.parse(message.body)
    console.log("Processing Message", body)

    let requestParameters = body.detail.requestParameters
    let job = utils.parseS3JobResultsArgs(requestParameters)
    if (!job) {
      continue;
    }
    //By wrapping this into function, it captures the variables between each loop iteration
    (params => {
      let filePath = "/tmp/" + params.fileName
      s3Utils.download(params.bucket, params.key, filePath)
        .then(outputFile => utils.decompress(outputFile, "/tmp/out"))
        .then(outputDir => utils.getFileList(outputDir))
        .then(files => {
          console.log("Trying to process files:", files)
          if (files.length != 1) {
            throw "The output from a job should only have one file"
          }
          return utils.loadFile(files[0])
        })
        .then(sentiment => processKeyPhrases(params, sentiment))
       // .then(s3Utils.delete(params.bucket,params.key)) //TODO Uncomment this
        .then(() => {
          callback(null, 200)

        })
        .catch(e => callback(e, 500))
    })(job)
  }
};
