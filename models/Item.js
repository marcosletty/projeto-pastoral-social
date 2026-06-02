const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    id_item: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 0 },
    meta: { type: Number, required: true },
    icone: { type: String },
    intencoes: { type: Number, default: 0 } // Novo campo de métrica!
});

module.exports = mongoose.model('Item', itemSchema);