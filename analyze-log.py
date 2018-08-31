# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import re
import requests
import sys

from contextlib import closing

def main(args):
    log_urls = args.get("log_urls")

    if not log_urls:
        return { "error": "Expected log_urls to be specified." }

    failed_tests = {}

    for log_url in log_urls:
        with closing(requests.get(log_url, stream=True)) as r:
            for line in r.iter_lines():
                m = re.match("""^([^>]*) > (.*) FAILED$""", line.strip())
                if m is not None:
                    suite = m.group(1)
                    test = m.group(2)
                    failed_tests.setdefault(suite, []).append(test)

    return { 
        "log_url": log_url,
        "failed_tests" : failed_tests
    }

# For local testing.
if __name__ == "__main__":
    result = main({ "log_urls": sys.argv[1] })
    print json.dumps(result, indent=2)
