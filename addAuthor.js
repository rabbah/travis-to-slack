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

const dbname = 'travis2slack'
const cloudantBinding = process.env['CLOUDANT_PACKAGE_BINDING'];
const slackConfig = {
  token: process.env['SLACK_TOKEN'],
  username: 'whiskbot',
  url: 'https://slack.com/api/chat.postMessage'
}

if (slackConfig.token === undefined) {
  console.error('SLACK_TOKEN required in environment.')
  process.exit(-1)
}

if (cloudantBinding === undefined) {
  console.error('CLOUDANT_PACKAGE_BINDING required in environment.')
  process.exit(-1)
}

function prepareDocument(args) {
  const name = args["name"]
  const userID = args["userID"]

  if (name == undefined) {
    return { error: "`name` was not defined" }
  }
  if (userID == undefined) {
    return { error: "`userID` was not defined" }
  }

  return { _id: name, display_name: name, userID: userID, onSuccess: true }
}

function slackResponse(args) {
  const name = args["name"]
  const userID = args["userID"]
  const sc = args["slackConfig"]

  const message = "Hi, " + name + ". I will now notify you when TravisCI completes testing of your Apache OpenWhisk PRs."

  return Object.assign(sc, { channel: "@" + userID, text: message });
}

composer.let({ db: dbname, sc: slackConfig },
  composer.sequence(
    composer.retain(
      composer.sequence(
        prepareDocument,
        p => { return { dbname: db, doc: p, overwrite: true } },
        composer.try(`${cloudantBinding}/write`, _ => { return { error: 'Failed to add author document to Cloudant' } })
      )),
    ({ result, params }) => Object.assign(params, { slackConfig: sc }),
    slackResponse,
    `/whisk.system/slack/post`
  ))
