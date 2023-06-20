const AWS = require("aws-sdk");
let s3client = new AWS.S3();
const fs = require('fs')


async function sizeOf(bucket, key) {
  console.log(`Getting size of s3://${bucket}/${key}`)
  let res = await s3client.headObject({ Key: key, Bucket: bucket })
    .promise()
  return res.ContentLength
}

async function deleteObject(bucket, key) {
  var params = {
    Bucket: bucket,
    Key: key

  };
  console.log(`Trying to delete s3://${bucket}/${key}`)
  console.log("params", params)
  await s3client.deleteObject(params).promise()
}

function downloadObject(bucket, key, filePath) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    s3client.getObject(params).promise()
      .then(data => {
        fs.writeFileSync(filePath, data.Body)
        console.log("Downloaded " + filePath)
        resolve(filePath)
      })
  })
}



module.exports = {
  getSize: sizeOf,
  delete: deleteObject,
  download: downloadObject
}