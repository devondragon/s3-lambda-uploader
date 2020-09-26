# Instructions

This may look like a lot, but it's actually very simple and should only take a couple minutes start to finish!

1. ## Create S3 Bucket

Create a new AWS S3 bucket with the name and region of your choice. In this tutorial we will be using the name "blackmagic-file-upload-bucket" and working in the US West 2 Region (Oregon).

You can set whatever options you want for your use. You don't need to set any of them for this to work however.

For permissions, the default of "Block all public access" is fine and the most secure. If you need to provide public access to your bucket for specific reasons, go ahead.

Click "Create Bucket".

Now select your newly created Bucket from the list of Buckets. Now click the "Permissions" tab, and then the "CORS configuration" sub-tab under that pane.

Paste in the following:

    <?xml version="1.0" encoding="UTF-8"?>
        <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <CORSRule>
    		<AllowedOrigin>*</AllowedOrigin>
    		<AllowedMethod>PUT</AllowedMethod>
    		<MaxAgeSeconds>30000</MaxAgeSeconds>
    		<AllowedHeader>*</AllowedHeader>
    	</CORSRule>
    	</CORSConfiguration>

And click "Save".

2. ## Create IAM User

Now we need to create an IAM User with permissions to access that new S3 bucket. This User's credentials will be used by the Lambda function to access S3 and generate the upload URL.

Go into IAM, Users, and click Add User. Name the User whatever you like. In this tutorial we will be using the name "file-upload-user". Under Access Type you will need to select "Programmatic access".

You don't need to add the User to any Groups, although you can for your own management needs.

However you do need to set the access policy. Select the "Attach existing policies directly" tab, and then click on the "Create policy" button.

Under Service, select "S3".

Under Actions, under "Read" select "GetObject" and under "Write" select "PutObject".

Under Resources put in your Bucket Name, and under Object name, select "Any" or put in "\*".

If you select the "JSON" tab you should see JSON that looks like this:

![IAM User Policy JSON](https://p198.p4.n0.cdn.getcloudapp.com/items/nOunE6p7/by%20default%202020-09-26%20at%203.15.27%20PM.png?v=6707ea4113794dbc723bd8d9b800dd6d "JSON")

Click "Review Policy" and give the Policy a Name. In this tutorial we will be using the name "file-upload-policy". Then click "Create Policy".

You may need to click the Refresh button back on the Add User page, and then search for the policy name you just created, and select the checkbox next to it, before clicking the "Next: Tags" button.

You don't need to add any Tags to the User, although you can for your own management needs.

The Review should look like this:

![IAM New User Review](https://p198.p4.n0.cdn.getcloudapp.com/items/jkuDr2yo/by%20default%202020-09-26%20at%203.22.31%20PM.png?v=eac377df9261840785a472cb9dc95fab "User Review")

Now click "Create User".

On the Success page you can see the "Access key ID", and the "Secret access key" for your new User. Copy or save those as you will need them later.

3. ## Create Lambda Function

Now go to the AWS Lamdba page in the AWS Console. Click "Create Function" to create your new Lambda function.

Select "Author from scratch", name your new function (we are using "file-upload-function"), and make sure the "Node.js 12.x" Runtime is selected.

You can leave the Permissions section with defaults.

Click the "Create function" button.

Once the new function is created, you should have a page with a "Designer pane at the top, and a "Function code" pane below it. In the "Function code" pane, replace the default contents of the index.js file in the editor, with the contents of the index.js file in this GitHub repository: [index.js](https://raw.githubusercontent.com/devondragon/s3-lambda-uploader/master/src/lambda/index.js)

Then you can Save or Deploy.

4. ## Configure Lamdba Function

Now you need to configure your Lambda function. On the next pane down, "Environment variables", click the "Manage environment variables" button.

We are going to add several Environment variables, so just click the Add button as needed to create the following six Key/Value pairs:

ACCESSKEYID - %The access key id from your User created in Step 2 %
SECRETACCESSKEY - %The secret access key from your User created in Step 2 %
REGION - %The Region your S3 bucket was created in, e.g. us-west-2 %
UPLOADBUCKET - % The Bucket Name, e.g. blackmagic-file-upload-bucket %
UPLOADFOLDER - % The name of the path under the Bucket you want the files to go in, e.g. uploads/ The trailing slash is required. %
FILENAMESEP - % The seperator string of your choice. This will be used between the random six characters and the original filename for the uploaded object (see examples in the README.md), e.g. ---- %

5. ## Create API Gateway

We will want to direct access to our Lambda through the AWS API Gateway, so in the top pane "Designer", click the "Add trigger" button on the left.

Select "API Gateway" as the Trigger type. Then under the API dropdown select "Create an API".

In this case we can use the simpler "HTTP API" type.

For Security you can select "Open" as it will be being accessed via Javascript from all your end user's browsers.

Expand the "Additional Settings" section.

The API name will be pre-filled with "file-upload-function-API" and there is no reason to change it.

Enabling Cross-origin resource sharing will likely be needed for your use.

Finally click the "Add" button to create the API Gateway.

6. ## Test Lambda Function

It can be helpful to configure a test event to allow you to easily test your Lamdba function from the AWS Console.

Click on your Lambda function to return to the main Lamdba function page. In the "Function code" pane, click the dropdown arrow icon next to "Test", and select "Configure Events".

Select "Create new test event" and under the "Event template" dropdown find the "apigateway-aws-proxy" option which is under the "AWS" section.

Name the event in the "Event name" field. For this tutorial we are using the name "TestAPIEvent".

Replace line 8, which should be ""foo": "bar"" with the following:

    "fileName": "testFileName",
    "contentType": "text/html"

Now click the "Create" button to create your test event.

Now you can click the "Test" button, and you should see success or failure, and execution result detail at the top of the page, as well as response data below the code editor.

You should see a Success, with response statusCode 200, and with a JSON response body with two variables inside, an uploadURL which will be a long AWS S3 URL, and a filename, which should have six random characters, followed by the FILENAMESEP string you configured in step 4, followed by "testFileName".

If you are getting errors instead, you will need to dive in and figure out what is going wrong.

7. ## Add API Gateway URL into client side Javascript

If you click on the purple iconed "API Gateway" trigger item on the left side fo the "Designer" pane at the top of the page, you should get a new "API Gateway" pane below. If you expand the "Details" section, you should see an "API endpoint". That URL will need to be copied into the upload.js Javascript file as the value of the variable named "getUploadURLURL" on line 15.

8. ## Get HTML Form Upload Working

If you clone this repo you can just use the upload.html and upload.js files as a starting place. You will need to edit the upload.js file, and put in the API Endpoint URL from the last step in on line 15 as the value of the variable "getUploadURLURL".

Then load the upload.html file in your web browser. Click "Choose File", select a file, and then click the "Upload" button.

If all goes well you should see a green progress bar (which might move too fast to see if you are uploading a small file), and then an "Upload Complete!" success message when the upload is done.

Congratulations!!
