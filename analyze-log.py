import json
import re
import requests
import sys

from contextlib import closing

def main(args):
    log_url = args.get("log_url")

    if not log_url:
        return { "error": "Expected log_url to be specified." }

    failed_tests = {}

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
    result = main({ "log_url": sys.argv[1] })
    print json.dumps(result, indent=2)
