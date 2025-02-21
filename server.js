const { RPCServer } = require('ocpp-rpc');
const express = require('express');

const app = express();
const httpServer = app.listen(4000, '10.136.85.1', () => {
    console.log("🚀 OCPP Server running on ws://10.136.85.1:4000");
});

const rpcServer = new RPCServer();
httpServer.on('upgrade', rpcServer.handleUpgrade);

const RFID_DATA = [
    { namapengguna: "Nisa", nokartu: "043B1D529F6080", interval: 20 }, // detik
    { namapengguna: "Default", nokartu: "04681E2ADA6B80", interval: 30 }, // detik
];

const activeTransactions = new Map(); // Simpan transaksi aktif

rpcServer.on('client', client => {
    if (!client.identity) {
        console.log('❌ Closing connection: identity is required');
        client.socket.close(1000, "'identity' is required");
        return;
    }

    console.log(`✅ Client connected: ${client.identity}`);



    // 1️⃣ BootNotification (Ketika charger pertama kali terhubung)
    client.handle('BootNotification', ({ params }) => {
        console.log("⚡ Received BootNotification:", params);
        return {
            currentTime: new Date().toISOString(),
            interval: 10,
            status: "Accepted"
        };
    });

    // 2️⃣ Heartbeat (Charger mengirimkan waktu saat ini secara berkala)
    client.handle('Heartbeat', () => {
        console.log("💓 Received Heartbeat");
        return { currentTime: new Date().toISOString() };
    });

    // 3️⃣ Authorize (Validasi kartu RFID atau ID pengguna)
    client.handle('Authorize', ({ params }) => {
        console.log("🔑 Received Authorize:", params);

        // Cari RFID dalam array
        const userRFID = RFID_DATA.find(user => user.nokartu === params.idTag);

        if (userRFID) {
            console.log(`✅ Authorized: ${userRFID.namapengguna} (${params.idTag})`);
            return {
                idTagInfo: { status: "Accepted" }
            };
        } else {
            console.log(`❌ Unauthorized RFID: ${params.idTag}`);
            return {
                idTagInfo: { status: "Invalid" }
            };
        }
    });


    // 4️⃣ StatusNotification (Charger mengirimkan status connector)
    client.handle('StatusNotification', ({ params }) => {
        console.log("📡 Received StatusNotification:", params);
        return {};
    });

    // 5️⃣ StartTransaction (Memulai proses charging)
    client.handle('StartTransaction', async ({ params }) => {
        console.log("⚡ Received StartTransaction:", params);
        const { idTag, connectorId, meterStart, timestamp } = params;
        const transactionId = Math.floor(Math.random() * 10000);

        // Cari RFID di dalam array
        const userRFID = RFID_DATA.find(user => user.nokartu === idTag);

        if (!userRFID) {
            return { idTagInfo: { status: "Invalid" } };
        }

        console.log(`🚀 Transaction ${transactionId} started for RFID ${idTag} (${userRFID.namapengguna})`);

        activeTransactions.set(transactionId, { idTag, meterStart });

        // Atur timeout sesuai interval yang ditentukan
        const intervalMs = userRFID.interval * 1000; // Convert menit ke milidetik

        setTimeout(async () => {
            if (activeTransactions.has(transactionId)) {
                console.log(`🛑 Stopping transaction ${transactionId} after ${userRFID.interval} minutes`);
                try {
                    const response = await client.call("RemoteStopTransaction", { transactionId });
                    console.log("✅ RemoteStopTransaction Response:", response);
                } catch (error) {
                    console.error("❌ RemoteStopTransaction Failed:", error);
                }
            }
        }, intervalMs);


        return {
            transactionId: transactionId,
            idTagInfo: { status: "Accepted" }
        };
    });

    // 6️⃣ StopTransaction (Mengakhiri proses charging)
    client.handle('StopTransaction', ({ params }) => {
        const { transactionId } = params;

        if (activeTransactions.has(transactionId)) {
            console.log(`✅ Transaction ${transactionId} stopped`);
            activeTransactions.delete(transactionId);
        } else {
            console.log(`⚠️ Transaction ${transactionId} not found`);
        }
        console.log("🛑 Received StopTransaction:", params);
        return { idTagInfo: { status: "Accepted" } };
    });

    // 7️⃣ MeterValues (Charger mengirimkan data meteran listrik)
    client.handle('MeterValues', ({ params }) => {
        // console.log("🔢 Received MeterValues:", JSON.stringify(params, null, 2));
        params.meterValue.forEach(meter => {
            meter.sampledValue.forEach(sample => {
                if (sample.unit === "kW") {
                    console.log(`⚡ Measurand: ${sample.measurand}`);
                    console.log(`⚡ Unit: ${sample.unit || 'Unknown'} - Value: ${sample.value}`);
                }
            });
        });

        return {};
    });

    // 8️⃣ FirmwareStatusNotification (Charger mengirimkan status update firmware)
    client.handle('FirmwareStatusNotification', ({ params }) => {
        console.log("🖥️ Received FirmwareStatusNotification:", params);
        return {};
    });

    // 9️⃣ DiagnosticsStatusNotification (Charger mengirimkan status diagnosa)
    client.handle('DiagnosticsStatusNotification', ({ params }) => {
        console.log("🔍 Received DiagnosticsStatusNotification:", params);
        return {};
    });

    // 🔟 DataTransfer (Mengirim data tambahan ke server)
    client.handle('DataTransfer', ({ params }) => {
        console.log("📨 Received DataTransfer:", params);
        return { status: "Accepted" };
    });
});
