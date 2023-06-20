const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');

//
let sqs = new AWS.SQS()
async function getSQSMessage(queueUrl,maxMessages=1) {
    var params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages
    };
    let message = await sqs.receiveMessage(params).promise()
    return message
}

async function deleteSQSMessage(queueUrl, message) {
    let params = {
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle
    }

    await sqs.deleteMessage(params).promise()
}

async function sendMessages(queueUrl,messages) {
    var params = {
        QueueUrl: queueUrl,
        Entries: messages.map(m => {
            return {
                Id: uuidv4(),
                MessageBody: JSON.stringify(m)
            }
        })
    }
    await sqs.sendMessageBatch(params).promise();

}

async function getQueueLength(queueUrl){
    var params = {
        QueueUrl: queueUrl,
        AttributeNames: ["ApproximateNumberOfMessages" ]
      };
      var attributes = await sqs.getQueueAttributes(params).promise()
      console.log("getQueueLength",attributes)
      return attributes["Attributes"]["ApproximateNumberOfMessages"]
}


module.exports = {
    getMessages: getSQSMessage,
    deleteMessage: deleteSQSMessage,
    sendMessages: sendMessages,
    getQueueLength: getQueueLength

}
