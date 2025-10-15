# s3-lambda-uploader

> **Serverless file upload solution for AWS S3 using Lambda and pre-signed URLs**

A modern, secure, and scalable implementation for uploading files directly from web browsers to AWS S3, bypassing traditional web servers entirely. Perfect for static websites and single-page applications.

## ✨ Features

### Core Functionality
- **Direct S3 Uploads** - Files upload directly from browser to S3 using pre-signed URLs
- **Serverless Architecture** - No web server bottleneck; scales automatically with AWS Lambda
- **Universal File Support** - Works with any file type
- **Static Website Compatible** - Can be used with completely static websites

### Security & Reliability
- **Secure Pre-signed URLs** - Time-limited (5 minute) pre-signed URLs prevent unauthorized access
- **Filename Sanitization** - Prevents path traversal and injection attacks
- **Input Validation** - File size limits (100MB default) and content type validation
- **Collision Prevention** - Random 6-character prefix prevents filename conflicts
- **CORS Support** - Proper CORS preflight handling for cross-origin requests
- **No Credential Exposure** - S3 credentials never exposed to client

### Modern Implementation
- **AWS SDK v3** - Latest modular SDK for smaller bundle sizes and better performance
- **Modern JavaScript** - Vanilla JS with async/await, no jQuery dependency
- **Accessibility** - WCAG-compliant with ARIA labels and semantic HTML
- **User Experience** - Real-time progress tracking, upload cancellation, clear error messages
- **Configurable** - Environment-based configuration for easy deployment

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │         │ API Gateway  │         │    Lambda    │
│             │────1───>│              │────2───>│   Function   │
│             │<───6────│              │<───3────│              │
└─────────────┘         └──────────────┘         └──────────────┘
       │                                                  │
       │                                                  │4
       │                                                  ▼
       │                                          ┌──────────────┐
       │                                          │   S3 SDK     │
       │                                          └──────────────┘
       │                                                  │
       └──────────────────5──────────────────────────────┘
                                                          ▼
                                                  ┌──────────────┐
                                                  │  S3 Bucket   │
                                                  └──────────────┘
```

**Request Flow:**
1. User selects file in HTML form
2. JavaScript requests pre-signed URL from Lambda via API Gateway
3. Lambda generates pre-signed S3 URL with randomized filename
4. Lambda returns URL to browser
5. Browser uploads file directly to S3 using PUT request
6. Progress bar updates during upload

## 🚀 Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured (optional, but recommended)
- Basic understanding of Lambda, S3, and API Gateway

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/devondragon/s3-lambda-uploader.git
   cd s3-lambda-uploader
   ```

2. **Follow detailed setup instructions**
   - See [INSTRUCTIONS.md](INSTRUCTIONS.md) for complete step-by-step guide
   - Covers S3 bucket creation, IAM setup, Lambda deployment, and API Gateway configuration

3. **Configure the frontend**
   - Edit `src/frontend/config.js` and set your API Gateway endpoint:
     ```javascript
     apiEndpoint: 'https://your-api-id.execute-api.region.amazonaws.com/prod'
     ```

4. **Deploy and test**
   - Open `src/frontend/upload.html` in a browser
   - Select a file and upload
   - Check your S3 bucket for the uploaded file

## ⚙️ Configuration

### Lambda Environment Variables

The Lambda function requires these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `UPLOADBUCKET` | S3 bucket name | `my-upload-bucket` |
| `UPLOADFOLDER` | Path prefix for uploads (must end with `/`) | `uploads/` |
| `FILENAMESEP` | Separator between random prefix and filename | `----` |
| `REGION` | AWS region where S3 bucket exists | `us-west-2` |
| `ALLOWED_ORIGIN` | CORS origin (use `*` for dev, specific domain for prod) | `https://example.com` |
| `ACCESSKEYID` | IAM access key (optional if using IAM role) | `AKIA...` |
| `SECRETACCESSKEY` | IAM secret key (optional if using IAM role) | `wJalr...` |

**Note:** Using IAM roles is preferred over hardcoded credentials. Only set `ACCESSKEYID` and `SECRETACCESSKEY` if your Lambda execution role doesn't have S3 permissions.

### Frontend Configuration

Edit `src/frontend/config.js`:

```javascript
const CONFIG = {
  apiEndpoint: 'YOUR_API_GATEWAY_URL',
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB default
};
```

## 📁 Project Structure

```
src/
├── lambda/
│   └── index.js           # Lambda function for generating pre-signed URLs
└── frontend/
    ├── config.js          # Frontend configuration (API endpoint, limits)
    ├── upload.html        # HTML form with accessibility features
    ├── upload.js          # Modern vanilla JavaScript upload handler
    └── upload.css         # Basic styling for form and progress bar
```

## 🔒 Security Features

### Lambda Security
- ✅ CORS preflight handling for browser requests
- ✅ Environment variable validation on cold start
- ✅ Filename sanitization prevents path traversal
- ✅ Generic error messages prevent information leakage
- ✅ Time-limited pre-signed URLs (5 minute expiration)
- ✅ Configurable CORS origins

### Frontend Security
- ✅ File size validation before upload
- ✅ Proper URL parameter encoding
- ✅ XSS prevention using `textContent` instead of `innerHTML`
- ✅ No hardcoded credentials

### AWS Infrastructure Requirements
- S3 bucket CORS configuration for PUT requests
- IAM user/role with `GetObject` and `PutObject` permissions
- API Gateway CORS enabled for browser access

## 🎯 Use Cases

- **Static Website Uploads** - Add file upload capability to static sites (Netlify, GitHub Pages, etc.)
- **User Generated Content** - Allow users to upload images, documents, or media files
- **Form Submissions** - Handle file attachments in contact or application forms
- **Resume/Document Collection** - Accept resumes, portfolios, or other documents
- **Media Libraries** - Build custom file management systems
- **Serverless Applications** - Integrate with JAMstack or serverless architectures

## 🧪 Testing

### Test Lambda Directly
Use the AWS Console test feature with the "apigateway-aws-proxy" template:

```json
{
  "queryStringParameters": {
    "fileName": "testFileName",
    "contentType": "text/html"
  }
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "body": {
    "uploadURL": "https://your-bucket.s3.amazonaws.com/...",
    "filename": "abc123----testFileName"
  }
}
```

### Test End-to-End
1. Open `upload.html` in a browser
2. Select a file
3. Click Upload
4. Verify progress bar and success message
5. Check S3 bucket for uploaded file with random prefix

## 🔧 Customization

### Adjusting Upload Limits
Edit `src/frontend/config.js`:
```javascript
maxFileSizeBytes: 500 * 1024 * 1024, // Change to 500MB
```

### Changing URL Expiration
Edit `src/lambda/index.js`:
```javascript
const PRE_SIGNED_URL_EXPIRATION_SECONDS = 600; // Change to 10 minutes
```

### Custom Error Handling
Modify the `showError()` and `showSuccess()` functions in `upload.js` to integrate with your UI framework.

### Styling
Edit `upload.css` or integrate with your existing CSS framework.

## 📝 Recent Improvements

The `improvements` branch includes significant modernization:

- **AWS SDK v3** migration for better performance and smaller bundles
- **Vanilla JavaScript** implementation (removed jQuery dependency)
- **Enhanced security** with input sanitization and CORS handling
- **Accessibility improvements** with ARIA labels and semantic HTML
- **Configuration management** with separate config file
- **Code quality** improvements with const/let, async/await, and proper error handling
- **Production ready** with reduced logging and error message sanitization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is open source and available under standard open source terms.

## 📚 Additional Resources

- [Detailed Setup Instructions](INSTRUCTIONS.md)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

## 💬 Support

For questions or issues:
1. Check [INSTRUCTIONS.md](INSTRUCTIONS.md) for detailed setup steps
2. Review the [Issues](https://github.com/devondragon/s3-lambda-uploader/issues) page
3. Open a new issue with detailed information about your problem

---

**Built with ❤️ for the serverless community**
