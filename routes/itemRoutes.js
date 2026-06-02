const express = require('express');
const router = express.Router();
const Item = require('../models/Item.js');
const Config = require('../models/Config.js'); 
const asyncHandler = require('../utils/asyncHandler.js');

// 1. Ler Estoque
router.get('/estoque', asyncHandler(async (req, res) => {
    const itens = await Item.find();
    res.json(itens);
}));

// 2. Criar Novo Produto
router.post('/admin/item', asyncHandler(async (req, res) => {
    const { nome, meta, icone } = req.body;
    if (!nome || isNaN(meta)) {
        const erro = new Error("Dados incompletos.");
        erro.status = 400;
        throw erro;
    }
    
    let idAutomacao = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    const novoItem = new Item({ id_item: idAutomacao, nome, meta: Number(meta), icone: icone || "📦" });
    await novoItem.save();
    res.json({ sucesso: true });
}));

// 3. Atualizar (Balanço ou Meta)
router.put('/admin/atualizar', asyncHandler(async (req, res) => {
    const { id, quantidade, meta } = req.body;
    const item = await Item.findOneAndUpdate(
        { id_item: id }, 
        { quantidade: Number(quantidade), meta: Number(meta) },
        { new: true }
    );
    if (!item) throw new Error("Item não encontrado.");
    res.json({ sucesso: true });
}));

// 4. Movimentação (+ ou -)
router.post('/admin/movimentar', asyncHandler(async (req, res) => {
    const { id, valor, operacao } = req.body;
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) throw new Error("Valor inválido.");

    let item = await Item.findOne({ id_item: id });
    if (!item) throw new Error("Item inexistente.");

    if (operacao === 'entrada') item.quantidade += valorNum;
    else if (operacao === 'saida') {
        if (item.quantidade - valorNum < 0) {
            const erro = new Error(`Estoque insuficiente! Você só tem ${item.quantidade}.`);
            erro.status = 400;
            throw erro;
        }
        item.quantidade -= valorNum;
    }
    await item.save();
    res.json({ sucesso: true });
}));

// 5. Intenção de Doação
router.post('/publico/intencao', asyncHandler(async (req, res) => {
    const { id } = req.body;
    await Item.findOneAndUpdate({ id_item: id }, { $inc: { intencoes: 1 } });
    res.json({ sucesso: true });
}));

// 6. Configurações Globais
router.get('/config/:chave', asyncHandler(async (req, res) => {
    const config = await Config.findOne({ chave: req.params.chave });
    res.json({ valor: config ? config.valor : null });
}));

router.post('/config', asyncHandler(async (req, res) => {
    const { chave, valor } = req.body;
    await Config.findOneAndUpdate({ chave }, { valor }, { upsert: true });
    res.json({ sucesso: true });
}));

module.exports = router;