const { RPCClient } = require('ocpp-rpc');
const util = require('./common/util');

(async () => {
    const cli = new RPCClient({
        endpoint: 'ws://localhost:3000',
        identity: 'MikuCharger'
    });

    let statusCharging = false;
    let transactionId = util.generateTransactionId();
    let WhValue = 0;

    // Tangani pesan 'Say' dari server
    cli.handle('Say', ({ params }) => {
        console.log('Server said:', params);
    });

    await cli.connect();
    console.log("Connected to OCPP Server");

    // Kirim BootNotification ke server
    const bootResponse = await cli.call('BootNotification', {
        chargePointModel: "EV Miku Charger",
        chargePointVendor: "EV Miku Charger Inc"
    });

    const StatusNotificationResponse = await cli.call('StatusNotification', {
        connectorId: 1,
        errorCode: 'NoError',
        info: 'Available',
        status: 'Available',
        timestamp: new Date().toISOString(),
        vendorId: 'EV Miku Charger Inc',
        vendorErrorCode: 'Available'
    });

    console.log("BootNotification Response:", bootResponse);
    console.log("StatusNotification Response:", StatusNotificationResponse);

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
    cli.handle('RemoteStartTransaction', async ({ params }) => {
        console.log("⚡ Received RemoteStartTransaction:", params);
        statusCharging = true;

        try {
            await cli.call('StartTransaction', {
                transactionId: transactionId,
                idTag: params.idTag,
                meterStart: 0,
                timestamp: new Date().toISOString()
            });

            await cli.call('StatusNotification', {
                connectorId: 1,
                errorCode: 'NoError',
                info: 'Charging',
                status: 'Charging',
                timestamp: new Date().toISOString(),
                vendorId: 'EV Miku Charger Inc',
                vendorErrorCode: 'Charging'
            });

            async function sendMeterValues() {
                while (statusCharging) {
                    try {
                        const MeterValuesResponse = await cli.call('MeterValues', {
                            "connectorId": 1,
                            "transactionId": transactionId,
                            "meterValue": [
                                {
                                    "timestamp": new Date().toISOString(),
                                    "sampledValue": [
                                        {
                                            "value": "222.60",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Voltage",
                                            "phase": "L1-N",
                                            "location": "Body",
                                            "unit": "V"
                                        },
                                        {
                                            "value": "7.27",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Current.Import",
                                            "phase": "L1-N",
                                            "location": "Body",
                                            "unit": "A"
                                        },
                                        {
                                            "value": "1.62",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Power.Active.Import",
                                            "location": "Body",
                                            "unit": "kW"
                                        },
                                        {
                                            "value": WhValue,
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Energy.Active.Import.Register",
                                            "location": "Body",
                                            "unit": "Wh"
                                        },
                                        {
                                            "value": "0.00",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Voltage",
                                            "phase": "L2-N",
                                            "location": "Body",
                                            "unit": "V"
                                        },
                                        {
                                            "value": "0.00",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Voltage",
                                            "phase": "L3-N",
                                            "location": "Body",
                                            "unit": "V"
                                        },
                                        {
                                            "value": "0.00",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Current.Import",
                                            "phase": "L2-N",
                                            "location": "Body",
                                            "unit": "A"
                                        },
                                        {
                                            "value": "0.00",
                                            "context": "Sample.Periodic",
                                            "format": "Raw",
                                            "measurand": "Current.Import",
                                            "phase": "L3-N",
                                            "location": "Body",
                                            "unit": "A"
                                        }
                                    ]
                                }
                            ]
                        });
                        WhValue += 10;
                        console.log("MeterValues Response:", MeterValuesResponse);
                    } catch (error) {
                        console.error("Error sending metervalues:", error);
                    }

                    // Tunggu 10 detik sebelum iterasi berikutnya
                    await new Promise(resolve => setTimeout(resolve, 20000));
                }
            }

            sendMeterValues();

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
        statusCharging = false;

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

            console.log("🛑 StopTransaction Response:", stopTransactionResponse);

            await cli.call('StatusNotification', {
                connectorId: 1,
                errorCode: 'NoError',
                info: 'Finishing',
                status: 'Finishing',
                timestamp: new Date().toISOString(),
                vendorId: 'EV Miku Charger Inc',
                vendorErrorCode: 'Finishing'
            });

            setTimeout(async () => {
                await cli.call('StatusNotification', {
                    connectorId: 1,
                    errorCode: 'NoError',
                    info: 'Available',
                    status: 'Available',
                    timestamp: new Date().toISOString(),
                    vendorId: 'EV Miku Charger Inc',
                    vendorErrorCode: 'Available'
                });

            }, 10000);

            return { status: "Accepted" };
        } catch (error) {
            console.error("❌ Error processing RemoteStopTransaction:", error);
            return { status: "Error", message: error.message };
        }
    });

})();
