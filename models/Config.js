const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    chave: { type: String, required: true, unique: true },
    valor: { type: String, required: true }
});

module.exports = mongoose.model('Config', configSchema);