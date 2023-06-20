const AWS = require("aws-sdk");
const utils = require("./utilities")



async function canStartJob(fnListDetectionJob,listProperty,maxNumberOfJobs) {
    var listTopicsParams = {
        Filter: {
            JobStatus: "IN_PROGRESS",
        },
        MaxResults: 500,
    };
    let topics = await fnListDetectionJob(listTopicsParams).promise()
    let numActiveTopics = topics[listProperty].length

    listTopicsParams = {
        Filter: {
            JobStatus: "SUBMITTED",
        },
        MaxResults: 500,
    };
    topics = await fnListDetectionJob(listTopicsParams).promise()

    numActiveTopics += topics[listProperty].length
    console.log("Number of active jobs ", numActiveTopics, "max number of jobs",maxNumberOfJobs)
    let shouldStartJob = numActiveTopics < maxNumberOfJobs
    if(!shouldStartJob){
        utils.sleep(5000)
    }
    return shouldStartJob
}

module.exports = {
    canStartJob:canStartJob
}