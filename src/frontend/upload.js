jQuery(document).ready(function () {
  var pbar = $("#progressBar"),
    currentProgress = 0;
  function trackUploadProgress(e) {
    if (e.lengthComputable) {
      currentProgress = (e.loaded / e.total) * 100; // Amount uploaded in percent
      $(pbar).width(currentProgress + "%");

      if (currentProgress == 100) console.log("Progress : 100%");
    }
  }

  function getUploadURL(filename, filetype) {
    console.log("getUploadURL start!");
    var getUploadURLURL = "$$AWS API GATEWAY URL GOES HERE$$";
    var completeURL =
      getUploadURLURL + "?fileName=" + filename + "&contentType=" + filetype;
    var uploadURL;

    jQuery.ajax({
      url: completeURL,
      async: false,
      type: "GET",
      dataType: "json",
      success: function (data) {
        console.log(data);
        uploadURL = data.uploadURL;
        filename = data.filename;
        console.log("filename: " + filename);
        console.log("uploadURL: " + uploadURL);
      },
      error: function (data) {
        console.log("could not get upload URL");
      },
    });
    return uploadURL;
  }

  function showError(message) {
    $("#fileUploadMessage").addClass("active");
    $("#fileUploadMessage").html(message);
    $(pbar).width(0).removeClass("active");
  }

  function sendFile(e) {
    e.preventDefault();
    $("#fileUploadMessage").removeClass("active");
    $(pbar).width(0).addClass("active");

    // get the reference to the actual file in the input
    var theFormFile = $("#file").get()[0].files[0];

    // Validate file exists
    if (!theFormFile) {
      showError("Please select a file to upload.");
      return false;
    }

    var filename = theFormFile.name;
    console.log("filename: " + filename);

    var filetype = theFormFile.type;
    console.log("filetype: " + filetype);

    // Validate file size (100MB max)
    var maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (theFormFile.size > maxSize) {
      showError("File is too large. Maximum file size is 100MB.");
      return false;
    }

    // Log file size for debugging
    console.log("filesize: " + (theFormFile.size / 1024 / 1024).toFixed(2) + "MB");

    var uploadURL = getUploadURL(filename, filetype);

    // Validate upload URL was received
    if (!uploadURL) {
      showError("Failed to get upload URL from server. Please try again.");
      return false;
    }

    console.log("uploadURL: " + uploadURL);

    $.ajax({
      type: "PUT",
      url: uploadURL,
      // Content type must much with the parameter you signed your URL with
      contentType: filetype,
      // this flag is important, if not set, it will try to send data as a form
      processData: false,
      // the actual file is sent raw
      data: theFormFile,
      xhr: function () {
        // Custom XMLHttpRequest
        var appXhr = $.ajaxSettings.xhr();

        // Check if upload property exists, if "yes" then upload progress can be tracked otherwise "not"
        if (appXhr.upload) {
          // Attach a function to handle the progress of the upload
          appXhr.upload.addEventListener(
            "progress",
            trackUploadProgress,
            false
          );
        }
        return appXhr;
      },
      success: function () {
        // alert('File uploaded');
        $("#fileUploadMessage").addClass("active");
        $("#fileUploadMessage").html("Upload Complete!");
      },
      error: function (xhr, status, error) {
        var errorMsg = "Upload Failed!";
        if (xhr.status === 403) {
          errorMsg = "Upload Failed! Pre-signed URL may have expired. Please try again.";
        } else if (xhr.status === 0) {
          errorMsg = "Upload Failed! Network error or CORS issue.";
        } else if (xhr.responseText) {
          errorMsg = "Upload Failed! " + xhr.statusText;
        }
        showError(errorMsg);
        console.log("Upload error:", status, error, xhr);
      },
    });
    return false;
  }

  $(function () {
    $("#fileUploadForm").on("submit", sendFile);
  });
});
