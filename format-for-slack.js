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
 * Produces a travis post similar to this:
 * { "attachments": [ {
 *      "fallback": "These tests failed XYZ.",
 *      "color": "danger",
 *      "title": "Your build #1421 failed",
 *      "title_link": "https://api.travis-ci.org/jobs/174228592/log.txt?deansi=true",
 *      "fields": [
 *          {
 *              "title": "whisk.core.controller.test.AuthenticateTests",
 *              "value": "Authenticate should authorize a known user from cache"
 *          },  
 *          {
 *              "title": "whisk.core.controller.test.AuthenticateTests2",
 *              "value": "Authenticate should authorize a known user from cache2"
 *          }
 *      ],
 *      "footer": "Whisk PR bot",
 *      "ts": 123456789
 *   } ]
 * }
 */
function main(args) {
    const authorSlackInfo = args["authorSlackInfo"];

    // Too bad that we have to use error, but meh.
    if(authorSlackInfo === undefined) {
        return { "error": "No author info for '" + args["author"] + "'." };
    }

    if(args["pr_number"] === undefined) {
        return { "error": "No pull request number." };
    }

    if(authorSlackInfo["onSuccess"] || args["status"] !== "passed") {
        const verb = args["status"] === "error" ? "errored" : args["status"];
        const color = verb === "passed" ? "good" : "danger"

        const pretext = "Your build for PR #" + args["pr_number"] + " " + verb + ".";

        const title = `Travis build ${args["build_id"]}`
        const title_link = args.build_url

        const header_fields = [{
                title: "",
                value: `<${args.log_url}|Build Log>`,
                short: true
            }/*, {
                title: "",
                value: `PR <${args.compare_url}|${args["pr_number"]}>`,
                short: true
            }*/]

        const footer = args.compare_url
        const fallback = pretext;

        const failed_tests = args["failed_tests"] || {};
        const fields = Object.keys(failed_tests).map(suite => {
                return { title: suite, value: failed_tests[suite].join("\n") }
            });

        const attachments = [{
                    fallback: fallback,
                    color: color,
                    title: title,
                    title_link: title_link,
                    fields: header_fields.concat(fields),
                    footer: footer
            }];
        return { channel: "@" + authorSlackInfo["userID"], attachments: attachments, text: pretext };
    } else {
        return { info: "Not posting to Slack", input: args };
    }
}
