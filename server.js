const { RPCServer } = require('ocpp-rpc');
const { DateTime } = require('luxon');
const express = require('express');
const util = require('./common/util');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Simpan sementara di folder uploads

const app = express();
const httpServer = app.listen(3000, '10.231.15.1', () => {
    console.log("🚀 OCPP Server running on ws://10.231.15.1:3000");
});

const rpcServer = new RPCServer();
httpServer.on('upgrade', rpcServer.handleUpgrade);

const chargers = new Map();

app.use(express.json());

let transactionId = 0;

rpcServer.on('client', client => {

    if (!client.identity) {
        console.log('❌ Closing connection: identity is required');
        client.socket.close(1000, "'identity' is required");
        return;
    } else {
        chargers.set(client.identity, { status: "Available", lastHeartbeat: new Date() });
        console.log(`✅ Client connected: ${client.identity}`);
    }

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
        console.log(`💓 Heartbeat from ${client.identity}`);

        // Update last heartbeat agar tahu charger masih aktif
        if (chargers.has(client.identity)) {
            chargers.get(client.identity).lastHeartbeat = new Date();
        }

        return { currentTime: new Date().toISOString() };
    });

    // 3️⃣ Authorize (Validasi kartu RFID atau ID pengguna)
    client.handle('Authorize', ({ params }) => {
        console.log("🔑 Received Authorize:", params);
        return { idTagInfo: { status: "Accepted" } };
    });

    // 4️⃣ StatusNotification (Charger mengirimkan status connector)
    client.handle('StatusNotification', ({ params }) => {
        console.log("📡 Received StatusNotification:", params);
        return {};
    });

    // 5️⃣ StartTransaction (Memulai proses charging)
    client.handle('StartTransaction', ({ params }) => {
        console.log("⚡ Received StartTransaction:", params);

        console.log(`🚀 Transaction ${transactionId} started`);
        return { transactionId: transactionId, idTagInfo: { status: "Accepted" } };
    });

    // 6️⃣ StopTransaction (Mengakhiri proses charging)

    client.handle('StopTransaction', ({ params }) => {
        console.log("🛑 Received StopTransaction:", params);
        return { idTagInfo: { status: "Accepted" } };
    });

    // 7️⃣ MeterValues (Charger mengirimkan data meteran listrik)
    client.handle('MeterValues', ({ params }) => {
        // console.log("🔢 Received MeterValues:", JSON.stringify(params, null, 2));
        params.meterValue.forEach(meter => {
            meter.sampledValue.forEach(sample => {
                if (sample.unit === "Wh") {
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

app.post('/service/start', async (req, res) => {
    try {
        const dateTimeNow = DateTime.now().setZone('utc').toISO({ suppressMilliseconds: true });
        req.body.timestamp = dateTimeNow;

        let client = Array.from(rpcServer._clients);
        client = client.find(client => client._identity === req.body.chargerId);

        if (!client) {
            return res.status(404).json({ error: "Charger not found or offline" });
        }

        transactionId = util.generateTransactionId();

        const response = await client.call('RemoteStartTransaction', req.body);
        return res.json({
            status_code: 200,
            message: "Service Started",
            transactionId: transactionId,
            response: response
        });
    } catch (error) {
        console.error("❌ Error Start Transaction:", error);
        return res.status(500).json({
            status_code: 500,
            message: "Failed to send StatusNotification",
            error: error.message
        });
    }
})

app.post('/service/stop', async (req, res) => {
    try {
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
})

app.get('/service/configuration', async (req, res) => {
    try {
        const { chargerId } = req.body;

        // Cari client berdasarkan chargerId
        let client = Array.from(rpcServer._clients)
            .find(client => client._identity === chargerId);

        if (!client) {
            return res.status(404).json({ error: "Charger not found or offline" });
        }

        // Kirim perintah Soft Reset ke charger
        const response = await client.call('GetConfiguration', {});

        return res.json({
            status_code: 200,
            message: "Get Configuration",
            response: response
        });
    } catch (error) {
        console.error("❌ Error Reset Charger:", error);
        return res.status(500).json({
            status_code: 500,
            message: "Failed to send Reset command",
            error: error.message
        });
    }
});

app.post('/service/upload-firmware', upload.single('firmware'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Firmware file is required" });
        }

        const { chargerId, retryInterval = 5 } = req.body;
        let client = Array.from(rpcServer._clients)
            .find(client => client._identity === chargerId);

        if (!client) {
            return res.status(404).json({ error: "Charger not found or offline" });
        }

        // const firmwarePath = `http://your-server.com/uploads/${req.file.filename}`; // Simpan di tempat yang bisa diakses

        // Kirim perintah update firmware ke charger
        // const response = await client.call('UpdateFirmware', {
        //     location: firmwarePath,
        //     retrieveDate: new Date().toISOString(),
        //     retryInterval
        // });

        return res.json({
            status_code: 200,
            message: "Firmware update initiated",
            // response: response
        });

    } catch (error) {
        console.error("❌ Error updating firmware:", error);
        return res.status(500).json({
            status_code: 500,
            message: "Failed to upload firmware",
            error: error.message
        });
    }
});


app.get('/service/chargers', (req, res) => {
    return res.json(Array.from(chargers.entries()).map(([chargerId, data]) => ({
        chargerId,
        status: data.status,
        lastHeartbeat: data.lastHeartbeat,
    })));
});
