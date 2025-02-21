// Request
[
    2,
    "4455",
    "MeterValues",
    {
        "connectorId": 1,
        "transactionId": 12345,
        "meterValue": [
            {
                "timestamp": "2024-02-20T12:20:00Z",
                "sampledValue": [{ "value": "5.0", "unit": "kWh" }]
            }
        ]
    }
]

// Response
[
    3,
    "4455",
    {}
]
