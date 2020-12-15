/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

/**
 * @param args of the format:
 *           { "author" : string, 
 *             "build_id": numeric_string,
 *             "status": "success" | "error" | "failure" }
 * @return the record augmented with { "job_ids" : [numeric_string], "log_urls": [url] }
 */
function main(args) {
    const build_id = args["build_id"]

    if(!build_id || isNaN(build_id)) {
        return { "error": "Expected build_id to be a numerical string." };
    }

    const request = require("request");

    const travisBuildURL = "https://api.travis-ci.com/build/" + build_id;

    return new Promise(function (resolve, reject) {
        request.get({
            "url" : travisBuildURL,
            "json" : true,
            headers : {
                "Accept": "application/vnd.travis-ci.2+json",
                "Travis-API-Version": "3"
            }
        }, function (error, response, body) {
            if(error) {
                reject("error while fetching Travis build");
            } else {
                // forwards the incoming arguments...
                let result = args;
                // ... after augmenting with array of job ids and log urls
                result["job_ids"] = body["jobs"].map(j => j["id"])
                result["log_urls"] = result["job_ids"].map(job_id => "https://api.travis-ci.com/job/" + job_id + "/log.txt");
                resolve(result);
            }
        });
    });
}
