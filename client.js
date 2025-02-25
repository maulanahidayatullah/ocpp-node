const { RPCClient } = require('ocpp-rpc');
const util = require('./common/util');

(async () => {
    const cli = new RPCClient({
        endpoint: 'ws://localhost:3000',
        identity: 'mikucharger'
    });

    // Tangani pesan 'Say' dari server
    cli.handle('Say', ({ params }) => {
        console.log('Server said:', params);
    });

    await cli.connect();
    console.log("Connected to OCPP Server");

    // Kirim BootNotification ke server
    const bootResponse = await cli.call('BootNotification', {
        chargePointModel: "EV Charger Model A",
        chargePointVendor: "EV Charger Inc"
    });
    console.log("BootNotification Response:", bootResponse);

    // Kirim Heartbeat ke server
    async function sendHeartbeat() {
        while (true) {
            try {
                const heartbeatResponse = await cli.call('Heartbeat');
                console.log("Heartbeat Response:", heartbeatResponse);
            } catch (error) {
                console.error("Error sending heartbeat:", error);
            }

            // Tunggu 10 detik sebelum iterasi berikutnya
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    sendHeartbeat();

    // Kirim StartTransaction ke server
    // const startTransactionResponse = await cli.call('StartTransaction', {
    //     idTag: "043B1D529F6080",
    //     connectorId: 1,
    //     meterStart: 1000,
    //     timestamp: new Date().toISOString()
    // });
    // console.log("StartTransaction Response:", startTransactionResponse);

    cli.handle('RemoteStartTransaction', async ({ params }) => {
        console.log("⚡ Received RemoteStartTransaction:", params);

        const transactionId = util.generateTransactionId();
        try {
            await cli.call('StartTransaction', {
                transactionId: transactionId,
                idTag: params.idTag,
                meterStart: 0,
                timestamp: new Date().toISOString()
            });

            return {
                status: "Accepted"
            };
        } catch (error) {
            console.error("❌ Error processing RemoteStartTransaction:", error);
            return { status: "Error", message: error.message };
        }
    });

    cli.handle('RemoteStopTransaction', async ({ params }) => {
        console.log("⚡ Received RemoteStopTransaction:", params);

        try {
            if (!params.transactionId) {
                console.log("❌ Missing transactionId");
                return { status: "Rejected", message: "Transaction ID is required" };
            }

            const stopTransactionResponse = await cli.call('StopTransaction', {
                transactionId: params.transactionId,
                meterStop: params.meterStop || 1200,
                timestamp: new Date().toISOString()
            });

            console.log("✅ StopTransaction Response:", stopTransactionResponse);

            if (!stopTransactionResponse || stopTransactionResponse.idTagInfo.status !== "Accepted") {
                console.log("❌ StopTransaction rejected by charger.");
                return { status: "Rejected" };
            }

            return { status: "Accepted" };
        } catch (error) {
            console.error("❌ Error processing RemoteStopTransaction:", error);
            return { status: "Error", message: error.message };
        }
    });

})();
