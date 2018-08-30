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

const composer = require('@ibm-functions/composer')

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

function filterParams(args) {
  const userID = args.user_id
  const responseURL = args.response_url

  if (userID == undefined) {
    return { error: "`user_id` was not defined" }
  }

  return { userID: userID, responseURL: responseURL }
}

function slackResponse(args) {
  const userID = args.userID
  const sc = args.slackConfig

  const message = "I'm sorry, unsubscription is still manual. Please contact the app owner for help"

  return Object.assign(sc, { channel: "@" + userID, text: message });
}

module.exports = composer.let({ db: dbname, sc: slackConfig },
  composer.sequence(
    `/whisk.system/utils/echo`,
    filterParams,
    p => Object.assign(p, { slackConfig: sc }),
    slackResponse,
    `/whisk.system/slack/post`
  ))
