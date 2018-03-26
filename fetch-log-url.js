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
 * @param args of the format { "job_id" : numeric_string }
 * @return { "log_url" : url }
 */
function main (args) {
    const job_id = args["job_id"];

    if(!job_id || isNaN(job_id)) {
        return { "error": "Expected job_id to be a numerical string." };
    }

    const c1 = "https://api.travis-ci.org/jobs/" + job_id + "/log.txt?deansi=true";
    const c2 = "https://s3.amazonaws.com/archive.travis-ci.org/jobs/" + job_id + "/log.txt";

    const request = require("request");

    return new Promise(function(resolve, reject) {
        console.log("Trying " + c1 + "...");
        request(c1, function (error1, response1, body1) {
            if(!error1 && response1.statusCode == 200) {
                console.log("Success!");
                resolve({ "log_url": c1 })
            } else {
                console.log("Trying " + c2 + "...");
                request(c2, function(error2, response2, body2) {
                    if(!error2 && response2.statusCode == 200) {
                        console.log("Success!");
                        resolve({ "log_url": c2 })
                    } else {
                        console.log("Failure to retrive log.");
                        reject("Couldn't obtain log URL. Tried:\n  - " + c1 + "\n  - " + c2);
                    }
                });
            }
        });
    });
}
