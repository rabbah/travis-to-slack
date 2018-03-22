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

const slackConfig = {
    token: process.env['SLACK_TOKEN'],
    username: 'whiskbot',
    url: 'https://slack.com/api/chat.postMessage'
}

if (slackConfig.token === undefined) {
    console.error('SLACK_TOKEN required in environment.')
    process.exit(-1)
}

function confusedMessage(args) {
    const user = args.payload.user
    const text = args.payload.text
    const message = `Sorry <@${user}>. I did not understand "${text}"\nTry saying \'subscribe travis "Git name"\' instead`

    return Object.assign(sc, { channel: '@' + user, text: message })
}

function victoryMessage(args) {
    const user = args.payload.user
    const text = args.payload.text
    const message = `Rock me amadeus!`

    return Object.assign(sc, { channel: '@' + user, text: message })
}

function parseAsSubscribe(args) {
    const user = args.payload.user;
    const text = args.payload.text;
    const command = 'subscribe travis '

    if (!text.startsWith(command)) {
        return { error: "Is not a subscribe message" }
    }
    const name = text.slice(command.length)

    return { name: name, userID: user }
}


composer.let({ sc: slackConfig },
    composer.sequence(
        `/whisk.system/utils/echo`,
        composer.let({ input: {} },
            p => { input = p; return p },
            composer.try(
                composer.sequence(
                    parseAsSubscribe,
                    `${prefix}/addAuthor`),
                composer.sequence(
                    _ => Object.assign(input, { slackConfig: sc }),
                    confusedMessage,
                    `/whisk.system/slack/post`
                ))
        )
    )
)
