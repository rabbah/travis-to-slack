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

function build_id_from_url(url) {
    const parts = url.split("/");
    const last = parts[parts.length - 1];

    if(!isNaN(last)) {
        // We still return as string to make sure it gets printed without reformatting.
        return last;
    } else {
        return undefined;
    }
}

function main(args) {
    const build_url = args["build_url"];
    const author = args["author_name"];
    const status = args["state"];
    const pr_number = args["pull_request_number"];

    if(typeof status !== "string" || typeof build_url !== "string" || typeof author !== "string") {
        console.log("state: " + status);
        console.log("build_url: " + build_url);
        console.log("author_name: " + author);
        console.log("pr_number: " + pr_number);
        return { "error": "Expected state, build_url and author_name of type string." };
    }

    const build_id = build_id_from_url(build_url);

    if(!build_id) {
        return { "error": "Could not extract build_id from build url: [" + build_url + "]." };
    }

    let output = {
        "status": status,
        "compare_url": args.compare_url,
        "author": author,
        "branch": args.branch,
        "build_id": build_id,
        "build_url": build_url
    };

    if(pr_number) {
        output["pr_number"] = new String(pr_number);
    }

    return output;
}
