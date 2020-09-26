const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
  region: process.env.REGION || "us-west-2", // Must be the same as your bucket
  signatureVersion: "v4",
});

const s3 = new AWS.S3();

const uploadBucket = process.env.UPLOADBUCKET;
const uploadFolder = process.env.UPLOADFOLDER;

exports.handler = async (event, context) => {
  console.log(event);
  const result = await getUploadURL(event, context);
  console.log("Result: ", result);
  return result;
};

const getUploadURL = async function (event, context) {
  console.log(event);
  console.log("getUploadURL started");
  let actionId = context.awsRequestId;
  let randomString = actionId.substr(actionId.length - 6);

  if (
    typeof event.queryStringParameters !== "undefined" ||
    event.queryStringParameters != null
  ) {
    var contentType = event.queryStringParameters.contentType;
    var fileName = event.queryStringParameters.fileName;
  }
  let fileNameSep = process.env.FILENAMESEP;

  if (
    typeof contentType == "undefined" ||
    contentType == null ||
    contentType == ""
  ) {
    contentType = "application/octet-stream";
  }

  if (typeof fileName == "undefined" || fileName == null || fileName == "") {
    fileName = actionId;
  } else {
    fileName = randomString + fileNameSep + fileName;
  }

  var s3Params = {
    Bucket: uploadBucket,
    Key: uploadFolder + `${fileName}`,
    ContentType: `${contentType}`,
  };

  return new Promise((resolve, reject) => {
    // Get signed URL
    let uploadURL = s3.getSignedUrl("putObject", s3Params);
    resolve({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        uploadURL: uploadURL,
        filename: `${fileName}`,
      }),
    });
  });
};
