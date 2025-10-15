// AWS SDK v3 - modular imports for better performance and smaller bundle size
const { S3Client } = require("@aws-sdk/client-s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 client with credentials
// Note: Best practice is to use IAM roles instead of hardcoded credentials
const clientConfig = {
  region: process.env.REGION || "us-west-2",
};

if (process.env.ACCESSKEYID && process.env.SECRETACCESSKEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
  };
}

const s3Client = new S3Client(clientConfig);

// Configuration constants
const uploadBucket = process.env.UPLOADBUCKET;
const uploadFolder = process.env.UPLOADFOLDER;
// CORS origin - defaults to "*" for backward compatibility, but should be set to specific domain
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const PRE_SIGNED_URL_EXPIRATION_SECONDS = 300; // 5 minutes
const RANDOM_PREFIX_LENGTH = 6; // Number of characters from requestId for filename prefix

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
    const lastDotIndex = sanitized.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const ext = sanitized.substring(lastDotIndex);
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    } else {
      sanitized = sanitized.substring(0, 255);
    }
  }

  return sanitized || null;
};

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      },
      body: ''
    };
  }

  // Validate environment on cold start
  try {
    validateEnvironment();
  } catch (error) {
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
  return result;
};

const getUploadURL = async function (event, context) {
  try {
    let actionId = context.awsRequestId;
    let randomString = actionId.slice(-RANDOM_PREFIX_LENGTH);

    let contentType;
    let fileName;

    if (event.queryStringParameters) {
      contentType = event.queryStringParameters.contentType;
      fileName = event.queryStringParameters.fileName;
    }
    let fileNameSep = process.env.FILENAMESEP;

    if (!contentType) {
      contentType = "application/octet-stream";
    }

    if (!fileName) {
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

    // Create PutObject command with parameters
    const command = new PutObjectCommand({
      Bucket: uploadBucket,
      Key: uploadFolder + `${fileName}`,
      ContentType: `${contentType}`,
    });

    // Generate pre-signed URL
    let uploadURL = await getSignedUrl(s3Client, command, {
      expiresIn: PRE_SIGNED_URL_EXPIRATION_SECONDS
    });

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
    // Log detailed error for debugging (server-side only)
    console.error("Error generating upload URL:", error);
    // Return generic error message to client (don't leak internal details)
    return {
      statusCode: 500,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({
        error: "Failed to generate upload URL. Please try again later.",
      }),
    };
  }
};
