const AWS = require("aws-sdk");
let mysql = require('mysql2/promise');



async function getSecret(secret_arn) {
    var secrets_client = new AWS.SecretsManager(); 
    let secret_value
    try {
      secret_value = await secrets_client.getSecretValue({ SecretId: secret_arn }).promise();
      return JSON.parse(secret_value.SecretString)
    }
    catch (err) {
      if (err) {
        if (err.code === 'DecryptionFailureException')
          // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
          // Deal with the exception here, and/or rethrow at your discretion.
          throw err;
        else if (err.code === 'InternalServiceErrorException')
          // An error occurred on the server side.
          // Deal with the exception here, and/or rethrow at your discretion.
          throw err;
        else if (err.code === 'InvalidParameterException')
          // You provided an invalid value for a parameter.
          // Deal with the exception here, and/or rethrow at your discretion.
          throw err;
        else if (err.code === 'InvalidRequestException')
          // You provided a parameter value that is not valid for the current state of the resource.
          // Deal with the exception here, and/or rethrow at your discretion.
          throw err;
        else if (err.code === 'ResourceNotFoundException')
          // We can't find the resource that you asked for.
          // Deal with the exception here, and/or rethrow at your discretion.
          throw err;
      }
      else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in secret_value) {
          return secret_value.SecretString;
        }
        else {
          let buff = new Buffer(secret_value.SecretBinary, 'base64');
          return buff.toString('ascii');
        }
      }
    }
}

let connection = null



module.exports = {
    getSecret: getSecret,
}