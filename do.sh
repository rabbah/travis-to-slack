#!/usr/bin/env bash

SLACK_TOKEN=${SLACK_TOKEN:?"SLACK_TOKEN should be set. Ask the author."}

WSK='wsk'
FSH='fsh'

# package name for actions
PREFIX="travis2slack"

# default memory for the actions
ACTION_MEMORY=128

function deploy() {
  # the package containing all actions needed by the app
  $WSK package update "${PREFIX}"
  $WSK action  update "${PREFIX}/extract" extract-build-info.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/is.failure" is-failure.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/fetch.job.id" fetch-job-id.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/fetch.log.url" fetch-log-url.js -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/analyze.log" analyze-log.py -m $ACTION_MEMORY
  $WSK action  update "${PREFIX}/format.for.slack" format-for-slack.js -m $ACTION_MEMORY
  deployApp
  deployHook
}

function deployApp() {
  # the app
  $FSH app update "${PREFIX}.app" travis2slack.js
}

function deployHook() {
  #receives webhook and kicks off the notification app
  $WSK action update "${PREFIX}.receive.webhook" receive-webhook.js -m $ACTION_MEMORY --web true -p '$actionName' "${PREFIX}.app" -p '$ignore_certs' true
}

function updateAuthorMap() {
  $WSK action update "${PREFIX}/format.for.slack" -p authorMap "${AUTHOR_MAP}"
}

function teardown() {
  $WSK action  delete "${PREFIX}/extract"
  $WSK action  delete "${PREFIX}/is.failure"
  $WSK action  delete "${PREFIX}/fetch.job.id"
  $WSK action  delete "${PREFIX}/fetch.log.url"
  $WSK action  delete "${PREFIX}/analyze.log"
  $WSK action  delete "${PREFIX}/format.for.slack"
  $WSK package delete "${PREFIX}"
  $WSK action  delete "${PREFIX}.app"
  $WSK action  delete "${PREFIX}.receive.webhook"
}

function test() {
  # Edit travis-example-payload.json and change the value of the very first field ("author_name") to a value of your choice.
  # Make sure the name also exists in author-map.json. If not, edit it, teardown and setup again.
  $WSK action invoke "${PREFIX}.receive.webhook" --param-file "sample-formdata.json"
}

function usage() {
  echo "Usage $@ [--deploy, --deploy-app, --deploy-hook, --update-authors, --teardown, --test]"
}

case "$1" in
--deploy )
deploy
;;
--deploy-app )
deployApp
;;
--deploy-hook )
deployHook
;;
--update-authors )
updateAuthorMap
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
