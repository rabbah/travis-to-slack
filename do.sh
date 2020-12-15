#!/usr/bin/env bash

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

SLACK_TOKEN=${SLACK_TOKEN:?"SLACK_TOKEN should be set. Ask the author."}
SLACK_EVENT_TOKEN=${SLACK_EVENT_TOKEN:?"SLACK_EVENT_TOKEN should be set. Ask the author."}

WSK='wsk'

# package name for actions
PREFIX="travis2slack"

# default memory for the actions
ACTION_MEMORY=128

function deployPackage() {
  # the package containing all helper actions needed by the apps
  $WSK package update "${PREFIX}"
  $WSK action  update "${PREFIX}/extract" extract-build-info.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/is.failure" is-failure.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/fetch.job.id" fetch-job-id.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/analyze.log" analyze-log.py --kind python:3 -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/format.for.slack" format-for-slack.js -m $ACTION_MEMORY
  deployApps
  deployHooks
}

function deployApps() {
  # the apps
  compose travis2slack.js > tmp.json && deploy "${PREFIX}/notifyApp" tmp.json --overwrite && rm -f tmp.json
  compose addSubscription.js > tmp.json && deploy "${PREFIX}/subscribeApp" tmp.json --overwrite && rm -f tmp.json
  compose removeSubscription.js > tmp.json && deploy "${PREFIX}/unsubscribeApp" tmp.json --overwrite && rm -f tmp.json
}

function deployHooks() {
  # the exposed webhooks
  $WSK action update "${PREFIX}/receive.travis.webhook" receive-webhook.js -m $ACTION_MEMORY --web true -p '$eventSource' 'travis' -p '$actionName' "${PREFIX}/notifyApp" -p '$ignore_certs' true
  $WSK action update "${PREFIX}/receive.slack-subscribe.webhook" receive-webhook.js -m $ACTION_MEMORY --web true -p '$eventSource' 'slack' -p '$actionName' "${PREFIX}/subscribeApp" -p '$ignore_certs' true -p expected_token "$SLACK_EVENT_TOKEN"
  $WSK action update "${PREFIX}/receive.slack-unsubscribe.webhook" receive-webhook.js -m $ACTION_MEMORY --web true -p '$eventSource' 'slack' -p '$actionName' "${PREFIX}/unsubscribeApp" -p '$ignore_certs' true -p expected_token "$SLACK_EVENT_TOKEN"
}

function teardown() {
  $WSK action  delete "${PREFIX}/extract"
  $WSK action  delete "${PREFIX}/is.failure"
  $WSK action  delete "${PREFIX}/fetch.job.id"
  $WSK action  delete "${PREFIX}/analyze.log"
  $WSK action  delete "${PREFIX}/format.for.slack"

  $WSK action  delete "${PREFIX}/notifyApp"
  $WSK action  delete "${PREFIX}/subscribeApp"
  $WSK action  delete "${PREFIX}/unsubscribeApp"

  $WSK action  delete "${PREFIX}/receive.travis.webhook"
  $WSK action  delete "${PREFIX}/receive.slack-subscribe.webhook"
  $WSK action  delete "${PREFIX}/receive.slack-unsubscribe.webhook"

  $WSK package delete "${PREFIX}"
}

function test() {
  # Edit the author map to provide a valid Slack id for "Jane Doe" for these examples to reach you on Slack.
  $WSK action invoke "${PREFIX}/receive.travis.webhook" --param-file "test1.json"
  $WSK action invoke "${PREFIX}/receive.travis.webhook" --param-file "test2.json"
  $WSK action invoke "${PREFIX}/receive.travis.webhook" --param-file "test3.json"
}

function usage() {
  echo "Usage $@ [--deploy, --deploy-app, --deploy-hook, --teardown, --test]"
}

case "$1" in
--deploy )
deployPackage
;;
--deploy-app )
deployApps
;;
--deploy-hook )
deployHooks
;;
--teardown )
teardown
;;
--test )
test
;;
* )
usage
esac
