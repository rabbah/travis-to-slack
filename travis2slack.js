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

const prefix = 'travis2slack'

const cloudantBinding = process.env['CLOUDANT_PACKAGE_BINDING']

const slackConfig = {
    token: process.env['SLACK_TOKEN'],
    username: 'whiskbot',
    url: 'https://slack.com/api/chat.postMessage'
}

if (slackConfig.token === undefined) {
    console.error('SLACK_TOKEN required in environment.')
    process.exit(-1)
}

if (cloudantBinding == undefined) {
    console.error('CLOUDANT_PACKAGE_BINDING required in environment.')
    process.exit(-1)
}

composer.sequence(
  `/whisk.system/utils/echo`,
  `${prefix}/extract`,
  `${prefix}/fetch.job.id`,
  composer.retain(
    composer.sequence(
      composer.retry(3, `${prefix}/fetch.log.url`),
      `${prefix}/analyze.log`)),
  ({result, params}) => Object.assign(result, params),
  composer.retain(
    composer.sequence(
      composer.literal({dbname: prefix, docid: 'authorMap' }),
      `${cloudantBinding}/read-document`)),
  ({result, params}) => Object.assign(result, params),
  `${prefix}/format.for.slack`,
  composer.retain(
    composer.literal(slackConfig)),
  ({result, params}) => Object.assign(result, params),
  `/whisk.system/slack/post`)

