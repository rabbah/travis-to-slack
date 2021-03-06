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

var openwhisk = require('openwhisk')

function main(args) {
    const wsk = openwhisk({ ignore_certs: args.$ignore_certs || false })
    var payload = undefined
    var initial_response = { text: 'ok' }

    if (args["$eventSource"] == 'travis') {
        console.log('Recevied event from travis')
        try {
            payload = JSON.parse(args.payload)
        } catch (e) {
            console.log('Exception parsing args.payload', e)
            return
        }
    } else if (args["$eventSource"] == 'slack') {
        console.log('Received event from slack')
        if (args.token != args.expected_token) {
            console.log('Dropping slack event with invalid token')
            console.log(args)
            return
        }

        // prevent secret from propagating downstream
        args.token = '<redacted slack token>'
        args.expected_token = '<redacted slack token>'

        // Slack url_verification protocol; return challenge value
        if (args.type == 'url_verification') {
            console.log('Received url_verification request')
            return { body: args.challenge }
        }

        // Some other slack event; flow args through to target action
        payload = args
        if (args.command) {
            initial_response = { text: 'Starting execution of ' + args.command }
        }

    } else {
        console.log('Received event from unexpected source ' + args["$eventSource"])
    }

    return new Promise(function (resolve, reject) {
        wsk.actions
            .invoke({
                actionName: args["$actionName"],
                params: payload,
                blocking: false
            })
            .then(id => {
                console.log(id)
                resolve(initial_response)
            })
            .catch(e => {
                console.log('error:', e)
                reject()
            })
    })
}
