# Setup Instructions

This comprehensive guide will walk you through deploying the S3 Lambda Uploader. While it may look lengthy, each step is straightforward and the entire process typically takes 10-15 minutes.

## Overview

You'll be setting up:
1. S3 bucket for file storage
2. IAM user or role for S3 access
3. Lambda function to generate pre-signed URLs
4. API Gateway to expose Lambda to browsers
5. Frontend configuration to connect everything

---

## Step 1: Create S3 Bucket

### Create the Bucket

1. Navigate to **S3** in the AWS Console
2. Click **Create bucket**
3. Choose a unique bucket name (e.g., `my-file-upload-bucket`)
4. Select your preferred region (e.g., `us-west-2`)
5. **Permissions**: Keep the default "Block all public access" for security
6. Click **Create bucket**

### Configure CORS

The bucket needs CORS configured to allow direct uploads from browsers.

1. Select your newly created bucket
2. Go to the **Permissions** tab
3. Scroll down to **Cross-origin resource sharing (CORS)**
4. Click **Edit** and paste the following JSON:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

5. Click **Save changes**

> **Production Note**: For production, replace `"*"` in `AllowedOrigins` with your specific domain(s), e.g., `["https://example.com", "https://www.example.com"]`

---

## Step 2: Create IAM Policy and User

The Lambda function needs permissions to access S3. You have two options:

### Option A: IAM User with Access Keys (Simpler)
Use this if you're just getting started or want explicit credential control.

### Option B: IAM Role (Recommended for Production)
Use Lambda execution roles instead of hardcoded credentials. More secure but requires additional IAM knowledge.

**This guide covers Option A. For Option B, see AWS documentation on Lambda execution roles.**

### Create the IAM Policy

1. Navigate to **IAM** → **Policies** in the AWS Console
2. Click **Create policy**
3. Select the **JSON** tab
4. Paste the following policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

5. Click **Next**
6. Name the policy (e.g., `s3-upload-policy`)
7. Click **Create policy**

### Create the IAM User

1. Navigate to **IAM** → **Users**
2. Click **Create user**
3. Enter a username (e.g., `file-upload-user`)
4. Click **Next**
5. Select **Attach policies directly**
6. Search for and select the policy you just created (`s3-upload-policy`)
7. Click **Next**, then **Create user**

### Create Access Keys

1. Click on your newly created user
2. Go to the **Security credentials** tab
3. Scroll to **Access keys** and click **Create access key**
4. Select **Application running outside AWS**
5. Click **Next**, then **Create access key**
6. **Important**: Copy both the **Access key ID** and **Secret access key**
7. Store them securely - you'll need them in Step 4

> **Security Best Practice**: Never commit these credentials to version control. Use environment variables or AWS Secrets Manager in production.

---

## Step 3: Create Lambda Function

### Create the Function

1. Navigate to **Lambda** in the AWS Console
2. Click **Create function**
3. Select **Author from scratch**
4. Configure the function:
   - **Function name**: `file-upload-function` (or your preferred name)
   - **Runtime**: Select **Node.js 20.x** (or latest available)
   - **Architecture**: x86_64 (default)
5. Under **Permissions**, leave default settings (creates a new execution role)
6. Click **Create function**

### Add the Lambda Code

1. In the **Code** tab, you'll see the inline code editor
2. Delete the default code in `index.js`
3. Copy the contents from this repository's Lambda function:
   - Visit: [https://raw.githubusercontent.com/devondragon/s3-lambda-uploader/main/src/lambda/index.js](https://raw.githubusercontent.com/devondragon/s3-lambda-uploader/main/src/lambda/index.js)
   - Copy all the code
4. Paste it into the Lambda code editor
5. Click **Deploy** to save the changes

> **Note**: The Lambda function uses AWS SDK v3, which is included in the Node.js 18+ runtime. No dependencies need to be installed.

---

## Step 4: Configure Lambda Environment Variables

The Lambda function reads its configuration from environment variables.

1. In your Lambda function, scroll down to **Configuration** tab
2. Click **Environment variables** in the left sidebar
3. Click **Edit**
4. Add the following environment variables by clicking **Add environment variable** for each:

| Key | Value | Example | Required |
|-----|-------|---------|----------|
| `UPLOADBUCKET` | Your S3 bucket name | `my-file-upload-bucket` | Yes |
| `UPLOADFOLDER` | Upload path prefix (must end with `/`) | `uploads/` | Yes |
| `FILENAMESEP` | Separator between random prefix and filename | `----` | Yes |
| `REGION` | AWS region of your S3 bucket | `us-west-2` | Yes |
| `ALLOWED_ORIGIN` | CORS allowed origin | `*` (dev) or `https://example.com` (prod) | Yes |
| `ACCESSKEYID` | IAM user access key from Step 2 | `AKIA...` | Yes* |
| `SECRETACCESSKEY` | IAM user secret key from Step 2 | `wJal...` | Yes* |

> **\*Note**: `ACCESSKEYID` and `SECRETACCESSKEY` are only required if you used Option A (IAM User) in Step 2. If you're using an IAM role attached to Lambda, you can omit these.

5. Click **Save** to apply the environment variables

### Configuration Examples

**Development Setup:**
```
UPLOADBUCKET=my-upload-bucket
UPLOADFOLDER=uploads/
FILENAMESEP=----
REGION=us-west-2
ALLOWED_ORIGIN=*
ACCESSKEYID=AKIAIOSFODNN7EXAMPLE
SECRETACCESSKEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Production Setup:**
```
UPLOADBUCKET=production-upload-bucket
UPLOADFOLDER=user-uploads/
FILENAMESEP=_
REGION=us-east-1
ALLOWED_ORIGIN=https://myapp.com
ACCESSKEYID=AKIAIOSFODNN7EXAMPLE
SECRETACCESSKEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

## Step 5: Create API Gateway

The API Gateway exposes your Lambda function so browsers can call it.

### Add API Gateway Trigger

1. In your Lambda function, go to the **Function overview** section
2. Click **Add trigger**
3. Select **API Gateway** from the dropdown
4. Configure the API:
   - **API type**: HTTP API (simpler and more cost-effective)
   - **Security**: Open (required for browser access)
   - Check **CORS** checkbox to enable cross-origin requests
5. Expand **Additional settings** (optional):
   - API name will default to `file-upload-function-API`
   - You can customize this if desired
6. Click **Add**

### Copy the API Endpoint URL

After creating the trigger:

1. Click on the **API Gateway** trigger in the function overview
2. You'll see an **API endpoint** URL like:
   ```
   https://abc123xyz.execute-api.us-west-2.amazonaws.com/default/file-upload-function
   ```
3. **Copy this URL** - you'll need it in Step 7 for frontend configuration

> **Important**: Save this URL somewhere accessible. It's the endpoint your frontend will call to request pre-signed upload URLs.

---

## Step 6: Test Lambda Function (Optional but Recommended)

Testing your Lambda function before frontend integration helps catch configuration issues early.

### Create Test Event

1. In your Lambda function, click the **Test** tab
2. Click **Create new event**
3. Configure the test event:
   - **Event name**: `TestUploadRequest`
   - **Template**: Select `apigateway-aws-proxy`
4. Replace the event JSON with the following:

```json
{
  "queryStringParameters": {
    "fileName": "test-file.txt",
    "contentType": "text/plain"
  },
  "requestContext": {
    "requestId": "test-request-id-123456"
  }
}
```

5. Click **Save**

### Run the Test

1. Click the **Test** button
2. Check the **Execution results** tab

### Expected Success Response

You should see:
- **Status**: Succeeded (green)
- **Response body** containing:
  ```json
  {
    "statusCode": 200,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    "body": "{\"uploadURL\":\"https://...\",\"filename\":\"abc123----test-file.txt\"}"
  }
  ```

The `filename` should have:
- 6 random characters (from request ID)
- Your `FILENAMESEP` value (e.g., `----`)
- The original filename

### Troubleshooting Test Failures

If you get errors, check:
- ✅ All environment variables are set correctly in Step 4
- ✅ IAM user has correct permissions for your S3 bucket
- ✅ Bucket name and region match your configuration
- ✅ `UPLOADFOLDER` ends with a trailing slash (`/`)
- ✅ Check CloudWatch Logs for detailed error messages

---

## Step 7: Configure Frontend

Now configure the frontend to connect to your Lambda function via API Gateway.

### Option 1: Using the Repository Files

If you cloned this repository:

1. Open `src/frontend/config.js` in a text editor
2. Replace the `apiEndpoint` value with your API Gateway URL from Step 5:

```javascript
const CONFIG = {
  apiEndpoint: 'https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/default/file-upload-function',
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB default
};
```

3. Save the file

### Option 2: Integrating into Your Own Website

Copy these files from `src/frontend/` to your project:
- `config.js` (edit with your API endpoint)
- `upload.js` (modern vanilla JavaScript, no dependencies)
- `upload.css` (optional styling)
- `upload.html` (reference implementation)

Update your HTML to include:
```html
<script src="config.js"></script>
<script src="upload.js"></script>
<link rel="stylesheet" href="upload.css">
```

---

## Step 8: Test End-to-End Upload

### Test the Upload Flow

1. Open `src/frontend/upload.html` in your web browser
   - For local testing: `file:///path/to/src/frontend/upload.html`
   - Or host on any web server (static hosting, localhost, etc.)

2. Click **Choose File** and select a test file

3. Click **Upload**

### Expected Behavior

✅ **Success indicators:**
- Progress bar appears and fills (may be quick for small files)
- "Upload Complete!" message appears
- File is in your S3 bucket in the `UPLOADFOLDER` path

✅ **Check S3 bucket:**
- Navigate to your S3 bucket in AWS Console
- Open the folder you specified (e.g., `uploads/`)
- You should see your file with the format: `abc123----yourfilename.ext`

### Troubleshooting Upload Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| CORS error in console | API Gateway CORS not enabled | Ensure CORS is checked in API Gateway trigger |
| 403 Forbidden | IAM permissions incorrect | Verify IAM user has `s3:PutObject` on bucket |
| 500 Server Error | Lambda configuration issue | Check CloudWatch logs for Lambda errors |
| File size limit error | File too large | Adjust `maxFileSizeBytes` in config.js |
| Network error | Wrong API endpoint | Verify API Gateway URL in config.js |

### View CloudWatch Logs

If uploads fail:
1. Go to **CloudWatch** → **Log groups** in AWS Console
2. Find `/aws/lambda/file-upload-function`
3. Check recent log streams for error details

---

## 🎉 Congratulations!

You've successfully set up a serverless file upload system!

### What You've Built

- ✅ Direct browser-to-S3 file uploads
- ✅ Serverless architecture that scales automatically
- ✅ Secure pre-signed URLs with time limits
- ✅ Collision-resistant filename handling
- ✅ Modern, accessible user interface

### Next Steps

**For Production Use:**
1. **Security**: Change `ALLOWED_ORIGIN` from `*` to your specific domain
2. **S3 CORS**: Update S3 CORS to allow only your domain
3. **IAM Role**: Consider using Lambda execution roles instead of access keys
4. **Monitoring**: Set up CloudWatch alerts for Lambda errors
5. **Validation**: Add file type restrictions if needed
6. **Costs**: Review AWS pricing for Lambda, API Gateway, and S3

**Customization:**
- Adjust file size limits in `config.js`
- Modify upload UI styling in `upload.css`
- Add custom validation logic in `upload.js`
- Implement post-upload processing (Lambda triggers on S3 events)

### Need Help?

- 📖 Review the [README.md](README.md) for architecture details
- 🐛 Check [GitHub Issues](https://github.com/devondragon/s3-lambda-uploader/issues)
- 📚 Consult [AWS Documentation](https://aws.amazon.com/documentation/)

**Happy uploading!** 🚀
