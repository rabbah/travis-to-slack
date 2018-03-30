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
const dbname = 'travis2slack'

const slackConfig = {
  token: process.env['SLACK_TOKEN'],
  username: 'whiskbot',
  url: 'https://slack.com/api/chat.postMessage'
}

if (slackConfig.token === undefined) {
  console.error('SLACK_TOKEN required in environment.')
  process.exit(-1)
}

/*
 * Return a composition that when executed on an input of the form { "author" : "Jane Smith"}
 * will find the slack information for said author and return it in the form
 * { authorSlackInfo : { userID: "UID", onSuccess: boolean } }.
 * At composition deployment time, the environment variable CLOUDANT_PACKAGE_BINDING
 * controls whether lookup is done against a bound Cloudant instance or author-map.json.
 */
function getAuthorMapComposition() {
  const cloudantBinding = process.env['CLOUDANT_PACKAGE_BINDING'];
  if (cloudantBinding == undefined) {
    const fs = require('fs');
    const authorMap = JSON.parse(fs.readFileSync('author-map.json', 'utf8'));
    return composer.let({ am: authorMap }, p => {
      return am[p.author] == undefined ? {} : am[p.author]
    })
  } else {
    return composer.let({ db: dbname },
      composer.sequence(
        p => ({ dbname: db, docid: p.author.trim().toUpperCase() }),
        composer.try(`${cloudantBinding}/read-document`, _ => ({}))
      ))
  }
}

composer.let({ prDetails: null, authorSlackInfo: null },
  composer.sequence(
    `/whisk.system/utils/echo`,
    `${prefix}/extract`,
    `${prefix}/fetch.job.id`,
    p => { prDetails = p },
    composer.if(
      _ => prDetails.pr_number == undefined,
      _ => {
        const msg = 'No PR number in TravisCI input; terminating computation';
        console.log(msg);
        return msg
      },
      composer.sequence(
        getAuthorMapComposition(),
        p => { authorSlackInfo = p },
        composer.if(
          _ => authorSlackInfo.userID == undefined,
          _ => {
            const msg = 'The PR author ' + prDetails.author + ' is not subscribed for notifications';
            console.log(msg);
            return msg
          },
          composer.sequence(
            _ => prDetails,
            composer.retry(3, `${prefix}/fetch.log.url`),
            `${prefix}/analyze.log`,
            p => Object.assign(p, prDetails, { authorSlackInfo: authorSlackInfo }),
            `${prefix}/format.for.slack`,
            composer.retain(composer.literal(slackConfig)),
            ({ result, params }) => Object.assign(result, params),
            `/whisk.system/slack/post`)
        )))))

