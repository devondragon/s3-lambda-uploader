// Configuration file for frontend application
// This file can be generated during build/deployment process
// or modified to read from environment-specific values

const CONFIG = {
  // AWS API Gateway endpoint URL for generating pre-signed upload URLs
  // Replace this with your actual API Gateway URL after deployment
  apiEndpoint: '$$AWS API GATEWAY URL GOES HERE$$',

  // Maximum file size allowed for uploads (in bytes)
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
};

// Export for ES modules or make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
