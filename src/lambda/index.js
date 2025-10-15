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
// CORS origin - defaults to "*" for backward compatibility, but should be set to specific domain
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

// Validate required environment variables
const validateEnvironment = () => {
  const required = ['UPLOADBUCKET', 'UPLOADFOLDER', 'FILENAMESEP'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Sanitize filename to prevent path traversal and remove dangerous characters
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove or replace dangerous characters (keep alphanumeric, dots, dashes, underscores)
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  // Limit length to 255 characters (common filesystem limit)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  return sanitized || null;
};

exports.handler = async (event, context) => {
  console.log(event);

  // Validate environment on cold start
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({
        error: 'Server configuration error',
      }),
    };
  }

  const result = await getUploadURL(event, context);
  console.log("Result: ", result);
  return result;
};

const getUploadURL = async function (event, context) {
  try {
    console.log(event);
    console.log("getUploadURL started");
    let actionId = context.awsRequestId;
    let randomString = actionId.substr(actionId.length - 6);

    if (
      typeof event.queryStringParameters !== "undefined" &&
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
      // Sanitize the filename to prevent security issues
      const sanitized = sanitizeFilename(fileName);
      if (!sanitized) {
        fileName = actionId; // Fall back to actionId if sanitization results in empty string
      } else {
        fileName = randomString + fileNameSep + sanitized;
      }
    }

    var s3Params = {
      Bucket: uploadBucket,
      Key: uploadFolder + `${fileName}`,
      ContentType: `${contentType}`,
      Expires: 300, // URL expires in 5 minutes (300 seconds)
    };

    // Get signed URL with expiration - this can throw errors
    let uploadURL = s3.getSignedUrl("putObject", s3Params);

    return {
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({
        uploadURL: uploadURL,
        filename: `${fileName}`,
      }),
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return {
      statusCode: 500,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({
        error: "Failed to generate upload URL",
        message: error.message,
      }),
    };
  }
};
