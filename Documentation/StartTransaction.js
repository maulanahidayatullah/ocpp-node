// Request
[
    2,
    "2233",
    "StartTransaction",
    {
        "connectorId": 1,
        "idTag": "ABC123",
        "meterStart": 0,
        "timestamp": "2024-02-20T12:10:00Z"
    }
]

// Response
[
    3,
    "2233",
    {
        "transactionId": 12345,
        "idTagInfo": { "status": "Accepted" }
    }
]
