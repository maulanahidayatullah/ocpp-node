module.exports = {
    generateTransactionId: () => {
        const min = Math.pow(10, 9);
        const max = Math.pow(10, 10) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
}