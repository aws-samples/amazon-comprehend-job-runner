"use strict";

const utils = require("/opt/nodejs/jobrunner/utilities")
const s3Utils = require("/opt/nodejs/jobrunner/s3")
const fs = require("fs")
const path = require("path")



function loadFile(file) {
  return new Promise((resolve, reject) => {
    try {
      console.log("Processing file", file)
      let data = fs.readFileSync(file, { encoding: 'utf8' })
      console.log("data", data)
      resolve(data)
    }
    catch (e) {
      reject(Error(e))
    }
  })
}

function processTopics(job, docTopicsFile,topicTermsFile) {
  //job.jobid - Comprehend assigned Job ID for Comprehend Topic Modeling job.
  return new Promise((resolve, reject) => {

    let connection
    let docTopicsData
    let docTermData
    //two files are created after the topic modeling job completes 
    // topic-terms - a list of words for each topic
    // doc-topics - top topics for a document
    loadFile(docTopicsFile)
      .then(data => {
        docTopicsData = data
        return loadFile(topicTermsFile)
      })
      .then((comprehendTopicTerms) => {
        let topTopics = comprehendTopicTerms.split("\n").map(lines => lines.split(",")[1]).slice(1)
        //remove the last line which is always blank
        topTopics.pop()
      
        let topicTerms = {}

        comprehendTopicTerms
          .split("\n")
          .forEach(line => {

            let fields = line.split(",")
            if (!topicTerms[fields[0]]) {
              topicTerms[fields[0]] = []
            }
            topicTerms[fields[0]].push({
              topic: fields[0],
              term: fields[1],
              weight: fields[2]
            })
          })
        let retValue = {
          jobId: job.jobId,
          topicTerms:topicTerms,
          topTopics: topTopics,
          docTopics: docTopicsData 
        }
        //TODO: Put your custom logic here to process the results.
        console.log("topics",JSON.stringify(retValue))
        return Promise.resolve()
      })


  })
}

  exports.handler = function(event, context, callback) {
    console.log("Processing event ",JSON.stringify(event))
    for (let message of event.Records) {

      let body = JSON.parse(message.body)
      console.log("message body",body)

      let requestParameters = body.detail.requestParameters
      let job = utils.parseS3JobResultsArgs(requestParameters)
      console.log("job",job)
      if (!job) {
        continue;
      }
      //By wrapping this into function, it captures the variables between each loop iteration
      (params => {
        let filePath = "/tmp/" + params.fileName
        let decompressedOutputPath = "/tmp/out"
        s3Utils.download(params.bucket, params.key, filePath)
          .then(outputFile => utils.decompress(outputFile, decompressedOutputPath))
          .then(outputDir => utils.getFileList(outputDir))
          .then(fileList => processTopics(params, 
              path.join(decompressedOutputPath,"doc-topics.csv"),
              path.join(decompressedOutputPath,"topic-terms.csv")))
          .then(() => {
            callback(null, 200)
            

          })
          .catch(e => callback(e, 500))
      })(job)
    }
  };
