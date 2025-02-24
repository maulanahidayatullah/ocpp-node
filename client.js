const { RPCClient } = require('ocpp-rpc');

(async () => {
    const cli = new RPCClient({
        endpoint: 'ws://10.231.15.1:3000',
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

    // Jalankan fungsi
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
        console.log("⚡ Received RemoteStopTransaction:", params);
        const stopTransactionResponse = await cli.call('StopTransaction', {
            transactionId: startTransactionResponse.transactionId,
            meterStop: 1200,
            timestamp: new Date().toISOString()
        });

        console.log("StopTransaction Response:", stopTransactionResponse);

        return stopTransactionResponse;
    });

    cli.handle('RemoteStopTransaction', async ({ params }) => {
        console.log("⚡ Received RemoteStopTransaction:", params);
        const stopTransactionResponse = await cli.call('StopTransaction', {
            transactionId: startTransactionResponse.transactionId,
            meterStop: 1200,
            timestamp: new Date().toISOString()
        });

        console.log("StopTransaction Response:", stopTransactionResponse);

        return stopTransactionResponse;
    });
})();
