"use strict"

const AWS = require("aws-sdk");
const sqs = require("/opt/nodejs/jobrunner/sqs") 
const s3 = require("/opt/nodejs/jobrunner/s3")
const comprehend = require("/opt/nodejs/jobrunner/comprehend")
const utils = require("/opt/nodejs/jobrunner/utilities")


const comprehendClient = new AWS.Comprehend({
    maxRetries:5,
    retryDelayOptions:{
        base: 300
    }
    });

async function startJob(inputParams) {
    let filesize

    let numberOfTopics = process.env.NumberOfTopics ? process.env.NumberOfTopics : 20

    try {
        filesize = await s3.getSize(inputParams.bucket, inputParams.key)
    }
    catch (e) {
        console.error(`Error getting size of s3://${inputParams.bucket}/${inputParams.key}.  Skipping processing....`)
        console.error(e)
        return undefined
    }

    //The file used for topic detection must be greater than 500 bytes/
    console.log("filesize", filesize)
    if (filesize < 500) {
        console.warn(`Skipping s3://${inputParams.bucket}/${inputParams.key}. The size of the file must be greater than 500 bytes"`)
        //await s3.delete(inputParams.bucket, inputParams.key)
        return undefined;

    }

    let params = {
        DataAccessRoleArn: process.env.ComprehendRole,

        /* required */
        InputDataConfig: { /* required */
            S3Uri: `s3://${inputParams.bucket}/${inputParams.key}`,
            InputFormat: "ONE_DOC_PER_FILE"
        },
        OutputDataConfig: { /* required */
            S3Uri: inputParams.outputS3Url,
        },
        ClientRequestToken: inputParams.awsRequestId,
        JobName: inputParams.awsRequestId,
        NumberOfTopics: numberOfTopics,
    };
    console.log("params", params)
    let results = await comprehendClient.startTopicsDetectionJob(params).promise()
    return results
}


var servicequotas = new AWS.ServiceQuotas();

exports.handler = async(event, context) => {
    console.log("Processing", JSON.stringify(event));


    var quotaParams = {
        QuotaCode: 'L-F2BED405',
        ServiceCode: 'comprehend'
    };
    let maxNumberOfJobs = (await servicequotas.getServiceQuota(quotaParams).promise())["Quota"]["Value"]

    let queueUrl = process.env.ExtractFileCreatedQueue
    // There are account limitations on how many jobs can be run simultaneously.
    // We have to manually get messages from the queue
    while (true) {
        if (await comprehend.canStartJob(comprehendClient.listTopicsDetectionJobs.bind(comprehendClient),"TopicsDetectionJobPropertiesList",maxNumberOfJobs)) {
            let sqsResponse = await sqs.getMessages(queueUrl,1)
            let messages = sqsResponse.Messages
            console.log("Processing ", messages)
            if (messages && messages.length == 1) {
                let requestParameters = JSON.parse(messages[0].Body)["detail"]["requestParameters"]
                let params = utils.parseComprehendS3JobExtractArgs(requestParameters,"topics")
                params.awsRequestId = context.awsRequestId
                console.log("Starting job", params)
                let response = await startJob(params)
                await sqs.deleteMessage(queueUrl, messages[0])
            }
            else {
                return {
                    moreMessages: false,
                    numberOfMessages: await sqs.getQueueLength(queueUrl)
                }
            }

        }
        // Keep polling until time is close to running out
        if (context.getRemainingTimeInMillis() / 1000 < 10) {
            return {
                moreMessages: true,
                numberOfMessages: await sqs.getQueueLength(queueUrl)

            }
        }
    }
}
