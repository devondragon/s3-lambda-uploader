document.addEventListener('DOMContentLoaded', function () {
  const pbar = document.getElementById('progressBar');
  const fileInput = document.getElementById('file');
  const messageDiv = document.getElementById('fileUploadMessage');
  const uploadForm = document.getElementById('fileUploadForm');
  const uploadButton = document.getElementById('uploadButton');
  const cancelButton = document.getElementById('cancelButton');
  let currentProgress = 0;
  let originalButtonText = uploadButton.textContent;
  let currentXHR = null; // Store reference to current upload request

  function trackUploadProgress(e) {
    if (e.lengthComputable) {
      currentProgress = (e.loaded / e.total) * 100; // Amount uploaded in percent
      pbar.style.width = currentProgress + '%';
      pbar.setAttribute('aria-valuenow', Math.round(currentProgress));

      if (currentProgress === 100) console.log('Progress: 100%');
    }
  }

  async function getUploadURL(filename, filetype) {
    console.log('getUploadURL start!');
    const getUploadURLURL = '$$AWS API GATEWAY URL GOES HERE$$';

    // Properly encode URL parameters
    const params = new URLSearchParams({
      fileName: filename,
      contentType: filetype
    });
    const completeURL = getUploadURLURL + '?' + params.toString();

    try {
      const response = await fetch(completeURL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      console.log('filename: ' + data.filename);
      console.log('uploadURL: ' + data.uploadURL);

      return {
        uploadURL: data.uploadURL,
        filename: data.filename
      };
    } catch (error) {
      console.error('Could not get upload URL:', error);
      return null;
    }
  }

  function showError(message) {
    messageDiv.classList.add('active');
    messageDiv.innerHTML = message;
    pbar.style.width = '0';
    pbar.classList.remove('active');
    uploadButton.disabled = false;
    uploadButton.textContent = originalButtonText;
    cancelButton.style.display = 'none';
    currentXHR = null;
  }

  function showSuccess(message) {
    messageDiv.classList.add('active');
    messageDiv.innerHTML = message;
    uploadButton.disabled = false;
    uploadButton.textContent = originalButtonText;
    cancelButton.style.display = 'none';
    currentXHR = null;
  }

  function cancelUpload() {
    if (currentXHR) {
      currentXHR.abort();
      showError('Upload cancelled by user.');
    }
  }

  async function sendFile(e) {
    e.preventDefault();
    messageDiv.classList.remove('active');
    pbar.style.width = '0';
    pbar.classList.add('active');

    // Get the reference to the actual file in the input
    const theFormFile = fileInput.files[0];

    // Validate file exists
    if (!theFormFile) {
      showError('Please select a file to upload.');
      return false;
    }

    // Disable button and show loading state
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';
    cancelButton.style.display = 'inline-block';

    const filename = theFormFile.name;
    console.log('filename: ' + filename);

    const filetype = theFormFile.type;
    console.log('filetype: ' + filetype);

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (theFormFile.size > maxSize) {
      showError('File is too large. Maximum file size is 100MB.');
      return false;
    }

    // Log file size for debugging
    console.log('filesize: ' + (theFormFile.size / 1024 / 1024).toFixed(2) + 'MB');

    // Get upload URL from Lambda
    const urlData = await getUploadURL(filename, filetype);

    // Validate upload URL was received
    if (!urlData || !urlData.uploadURL) {
      showError('Failed to get upload URL from server. Please try again.');
      return false;
    }

    const uploadURL = urlData.uploadURL;
    console.log('uploadURL: ' + uploadURL);

    // Upload file to S3 using pre-signed URL
    try {
      currentXHR = new XMLHttpRequest();

      // Set up progress tracking
      currentXHR.upload.addEventListener('progress', trackUploadProgress, false);

      // Set up completion handler
      currentXHR.onload = function () {
        if (currentXHR.status >= 200 && currentXHR.status < 300) {
          showSuccess('Upload Complete!');
        } else {
          let errorMsg = 'Upload Failed!';
          if (currentXHR.status === 403) {
            errorMsg = 'Upload Failed! Pre-signed URL may have expired. Please try again.';
          } else {
            errorMsg = 'Upload Failed! ' + currentXHR.statusText;
          }
          showError(errorMsg);
          console.error('Upload error:', currentXHR.status, currentXHR.statusText);
        }
      };

      // Set up error handler
      currentXHR.onerror = function () {
        showError('Upload Failed! Network error or CORS issue.');
        console.error('Upload network error');
      };

      // Set up abort handler
      currentXHR.onabort = function () {
        console.log('Upload aborted');
        // showError already called by cancelUpload()
      };

      // Send the file
      currentXHR.open('PUT', uploadURL);
      currentXHR.setRequestHeader('Content-Type', filetype);
      currentXHR.send(theFormFile);

    } catch (error) {
      showError('Upload Failed! ' + error.message);
      console.error('Upload error:', error);
    }

    return false;
  }

  // Attach form submit handler
  uploadForm.addEventListener('submit', sendFile);

  // Attach cancel button handler
  cancelButton.addEventListener('click', cancelUpload);
});
