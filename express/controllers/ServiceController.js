const { DateTime } = require('luxon');
const util = require('../../common/util');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

let transactionId = 0;

module.exports = {

    serviceStart: async (req, res) => {
        try {
            const rpcServer = req.app.locals.rpcServer;
            if (!rpcServer) {
                throw new Error("RPC Server not found");
            }

            let client = Array.from(rpcServer._clients).find(c => c._identity === req.body.chargerId);

            if (!client) {
                return res.status(404).json({ error: "Charger not found or offline" });
            }

            // Pasang event listener untuk StartTransaction
            eventEmitter.once('StartTransactionReceived', (transactionId) => {
                console.log("✅ Transaction ID received:", transactionId);
                eventEmitter.once('RemoteStartTransactionResponse', (remoteResponse) => {
                    console.log("✅ Remote Response received:", remoteResponse);
                    res.json({
                        status_code: 200,
                        message: "Service Started",
                        transactionId: transactionId,
                        response: remoteResponse
                    });
                });

            });

            // Pasang handler StartTransaction
            client.handle('StartTransaction', ({ params }) => {
                console.log("⚡ Received StartTransaction:", params);
                eventEmitter.emit('StartTransactionReceived', params.transactionId);
            });

            // Panggil RemoteStartTransaction
            const remoteResponse = await client.call('RemoteStartTransaction', req.body);
            eventEmitter.emit('RemoteStartTransactionResponse', remoteResponse);

        } catch (error) {
            console.error("❌ RPC Error:", error);
            return res.status(500).json({
                status_code: 500,
                message: "Failed to start transaction",
                error: error.message
            });
        }
    },

    serviceStop: async (req, res) => {
        try {
            const rpcServer = req.app.locals.rpcServer;
            const dateTimeNow = DateTime.now().setZone('utc').toISO({ suppressMilliseconds: true });
            req.body.timestamp = dateTimeNow;

            let client = Array.from(rpcServer._clients);
            client = client.find(client => client._identity === req.body.chargerId);

            if (!client) {
                return res.status(404).json({ error: "Charger not found or offline" });
            }

            const response = await client.call('RemoteStopTransaction', req.body);
            return res.json({
                status_code: 200,
                message: "Service Stoped",
                response: response
            })
        } catch (error) {
            console.error("❌ Error Stop Transaction:", error);
            return res.status(500).json({
                status_code: 500,
                message: "Failed to send ",
                error: error.message
            });
        }
    },
}