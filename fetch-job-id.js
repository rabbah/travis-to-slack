// Expects an input of the format:
// { "author" : string, "build_id": numeric_string, "status": "success" | "error" | "failure" }
// Returns the record augmented with "job_id" : numeric_string
function main(args) {
    const build_id = args["build_id"]

    if(!build_id || isNaN(build_id)) {
        return { "error": "Expected build_id to be a numerical string." };
    }

    const request = require("request");

    const travisBuildURL = "https://api.travis-ci.org/repos/openwhisk/openwhisk/builds/" + build_id;

    return new Promise(function (resolve, reject) {
        request.get({
            "url" : travisBuildURL,
            "json" : true,
            headers : {
                "Accept": "application/vnd.travis-ci.2+json"
            }
        }, function (error, response, body) {
            if(error) {
                reject("error while fetching Travis log id");
            } else {
                // forwards the incoming arguments...
                let result = args;
                // ... after augmenting with job id
                result["job_id"] = (body["jobs"][0]["id"]).toString();
                resolve(result);
            }
        });
    });
}
