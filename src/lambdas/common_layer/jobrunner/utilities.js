let decode = require('decode-html');
let striptags = require("striptags")
let path = require("path")
const fs = require("fs")
var targz = require('targz');


function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function parseS3ExtractArgs(requestParameters, outputPrefix) {
  let params = {
    outputS3Url: `s3://${requestParameters["bucketName"]}/output/${outputPrefix}`,
    bucket: requestParameters["bucketName"],
    key: requestParameters["key"]
  }

  return params
}

function loadFile(file) {
  return new Promise((resolve, reject) => {
    try {
      console.log("Processing file", file)
      let data = fs.readFileSync(file, { encoding: 'utf8' })
      console.log("data", data)
      resolve(JSON.parse(data))
    }
    catch (e) {
      reject(Error(e))
    }
  })
}

function parseS3JobResultsArgs(requestParameters,keyPrefix) {
  let jobId = requestParameters.key.replace(keyPrefix,"").split("-")[2].split("/")[0]
  let jobType = requestParameters.key.replace(keyPrefix,"").split("-")[1]
  let fileName = requestParameters.key.replace(keyPrefix,"").split("-")[2].split("/")[2]
  console.log("requestParameters", requestParameters)

  let params = {
    jobType: jobType,
    jobId: jobId,
    fileName: fileName,
    bucket: requestParameters["bucketName"],
    key: requestParameters["key"]
  }

  console.log("params",params)

  return params
}

function timeToStop(context, numSeconds = 10) {
  console.log("Time left in seconds ...", context.getRemainingTimeInMillis() / 1000)
  return context.getRemainingTimeInMillis() / 1000 < numSeconds
}


function decodeText(message) {
  let unescapedMessage = striptags(unescape(message))
  let decodedMessage = decode(unescapedMessage)
  return decodedMessage

}

function decompress(srcFile, dstFolder) {
  console.log(`decompressed ${srcFile} ${dstFolder}`)
  return new Promise((resolve, reject) => _untar(srcFile, dstFolder, resolve, reject))
}

function _untar(srcFile, dstFolder, resolve, reject) {
  {
    console.log(`SourecFile ${srcFile} Destination folder ${dstFolder}`)
    targz.decompress({
      src: srcFile,
      dest: dstFolder
    }, function (err) {
      if (err) {
        reject(Error(err))

      }
      else {
        resolve(dstFolder)


      }
    });

  }
}



function getFileList(directory) {
  return new Promise((resolve, reject) => {
    let dirfiles = []
    fs.readdir(directory, function (err, files) {
      if (err) {
        reject(Error(err));
      }
      //listing all files using forEach
      files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log("file:", file);
        dirfiles.push(path.join(directory, file))
      });
      resolve(dirfiles)
    })
  })
}

function createDateString(dateString) {
  let date = new Date(dateString)
  return date.getTime() == date.getTime() ? date.toISOString() : undefined
}

function getMonth(monthNum) {
  var monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return monthShortNames[monthNum-1]
}

function getDateOfISOWeek(w, y) {
  var simple = new Date(y, 0, 1 + (w - 1) * 7);
  var dow = simple.getDay();
  var ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart.toString().slice(0, 10);
}

module.exports = {
  sleep: sleep,
  parseComprehendS3JobExtractArgs: parseS3ExtractArgs,
  parseS3JobResultsArgs: parseS3JobResultsArgs,
  timeToStop: timeToStop,
  decodeText: decodeText,
  decompress: decompress,
  getFileList: getFileList,
  loadFile: loadFile,
  createDateString: createDateString,
  getMonth:getMonth,
  getDateOfWeek: getDateOfISOWeek
}