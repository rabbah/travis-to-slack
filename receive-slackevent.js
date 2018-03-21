var openwhisk = require('openwhisk')

function main(args) {
    const wsk = openwhisk({ ignore_certs: args.$ignore_certs || false })

    if (args.token != args.expected_token) {
        console.log('Dropping request with invalid token')
        console.log(args)
        return
    }

    if (args.type == 'url_verification') {
        console.log('Received url_verification request')
        return { body: args.challenge }
    }

    args.token = '<redacted slack token>' // prevent secret from propagating downstream


    if (args.type == 'event_callback') {
        console.log('Forwarding event_callback to target action')
        try {
            return new Promise(function (resolve, reject) {
                wsk.actions
                    .invoke({
                        actionName: args["$actionName"],
                        params: { type: args.type, payload: args.event },
                        blocking: false
                    })
                    .then(id => {
                        console.log(id)
                        resolve()
                    })
                    .catch(e => {
                        console.log('error:', e)
                        reject()
                    })
            })
        } catch (e) {
            console.log('exception', e)
            return
        }
    } else {
        console.log('Dropping unexpected event type: ' + args.type)
        console.log(args)
        return
    }
}
