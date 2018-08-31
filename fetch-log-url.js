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
 * @param args of the format { "job_ids" : [numeric_string] }
 * @return { "log_urls" : [url] }
 */
function main(args) {
    const job_ids = args["job_ids"];
    const request = require("request");

    const log_urls = job_ids.map(function (job_id) {

        const c1 = "https://api.travis-ci.org/jobs/" + job_id + "/log.txt?deansi=true";
        const c2 = "https://s3.amazonaws.com/archive.travis-ci.org/jobs/" + job_id + "/log.txt";

        return new Promise(function (resolve, reject) {
            console.log("Trying " + c1 + "...");
            request(c1, function (error1, response1, body1) {
                if (!error1 && response1.statusCode == 200) {
                    console.log("Success!");
                    resolve(c1)
                } else {
                    console.log("Trying " + c2 + "...");
                    request(c2, function (error2, response2, body2) {
                        if (!error2 && response2.statusCode == 200) {
                            console.log("Success!");
                            resolve(c2)
                        } else {
                            console.log("Failed to retrive log for sub-job "+job_id);
                            resolve("")
                        }
                    });
                }
            });
        })
    });

    return Promise.all(log_urls).then(function (urls) { return { "log_urls": urls.filter( x => x != "") } });
}
