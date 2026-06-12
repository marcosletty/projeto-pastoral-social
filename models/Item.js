const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    id_item: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 0 },
    por_cesta: { type: Number, default: 1 }, // Novo campo para cálculo automático
    meta: { type: Number, required: true },
    icone: { type: String, default: '📦' },
    intencoes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Item', itemSchema);