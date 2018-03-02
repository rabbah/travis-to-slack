var openwhisk = require('openwhisk')

function main(args) {
    const wsk = openwhisk({ignore_certs: args.$ignore_certs || false})

    if (args.payload) {
        try {
            payload = JSON.parse(args.payload)
            return new Promise(function(resolve, reject) {
                wsk.actions
                    .invoke({
                        actionName: args["$actionName"],
                        params: payload,
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
        console.log('no payload')
        return
    }
}
