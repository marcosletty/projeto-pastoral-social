// controllers/itemController.js
const Item = require('../models/Item.js');
const Config = require('../models/Config.js');
const { validationResult } = require('express-validator');

const verificarErros = (req) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        const erro = new Error(erros.array()[0].msg);
        erro.status = 400;
        throw erro;
    }
};

exports.listarEstoque = async (req, res) => {
    const itens = await Item.find();
    res.json(itens);
};

exports.criarItem = async (req, res) => {
    verificarErros(req);
    const { nome, meta, icone } = req.body;
    let idAutomacao = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    const novoItem = new Item({ id_item: idAutomacao, nome, meta: Number(meta), icone: icone || "📦" });
    await novoItem.save();
    res.json({ sucesso: true });
};

exports.atualizarItem = async (req, res) => {
    verificarErros(req);
    const { id, quantidade, meta } = req.body; // Correção de quantity para quantidade
    const item = await Item.findOneAndUpdate(
        { id_item: id }, 
        { quantidade: Number(quantidade), meta: Number(meta) },
        { returnDocument: 'after' }
    );
    if (!item) {
        const erro = new Error("Alimento não localizado.");
        erro.status = 404; throw erro;
    }
    res.json({ sucesso: true });
};

exports.movimentarEstoque = async (req, res) => {
    verificarErros(req);
    const { id, valor, operacao } = req.body;
    const valorNum = Number(valor);
    let itemAtualizado;

    if (operacao === 'entrada') {
        itemAtualizado = await Item.findOneAndUpdate({ id_item: id }, { $inc: { quantidade: valorNum } }, { returnDocument: 'after' });
        if (!itemAtualizado) { const erro = new Error("Produto inexistente."); erro.status = 404; throw erro; }
    } else if (operacao === 'saida') {
        itemAtualizado = await Item.findOneAndUpdate({ id_item: id, quantidade: { $gte: valorNum } }, { $inc: { quantidade: -valorNum } }, { returnDocument: 'after' });
        if (!itemAtualizado) {
            const existe = await Item.findOne({ id_item: id });
            if (!existe) { const erro = new Error("Produto inexistente."); erro.status = 404; throw erro; } 
            else { const erro = new Error(`Estoque Insuficiente! Saldo: ${existe.quantidade}.`); erro.status = 400; throw erro; }
        }
    }
    res.json({ sucesso: true, novaQuantidade: itemAtualizado.quantidade });
};

exports.registrarIntencao = async (req, res) => {
    verificarErros(req);
    const { id } = req.body;
    const item = await Item.findOneAndUpdate({ id_item: id }, { $inc: { intencoes: 1 } });
    if (!item) { const erro = new Error("Item não encontrado."); erro.status = 404; throw erro; }
    res.json({ sucesso: true });
};

exports.obterConfig = async (req, res) => {
    const config = await Config.findOne({ chave: req.params.chave });
    res.json({ valor: config ? config.valor : null });
};

exports.salvarConfig = async (req, res) => {
    verificarErros(req);
    const { chave, valor } = req.body;
    await Config.findOneAndUpdate({ chave }, { valor }, { upsert: true });
    res.json({ sucesso: true });
};

exports.zerarEstoque = async (req, res) => {
    await Item.updateMany({}, { $set: { quantidade: 0, intencoes: 0 } });
    res.status(200).json({ mensagem: 'Estoque e intenções totalmente limpos.' });
};

exports.zerarIntencoes = async (req, res) => {
    await Item.updateMany({}, { $set: { intencoes: 0 } });
    res.status(200).json({ mensagem: 'Métricas de intenções resetadas.' });
};

exports.excluirItem = async (req, res) => {
    verificarErros(req);
    const { id } = req.params;
    const itemDeletado = await Item.findOneAndDelete({ id_item: id });
    if (!itemDeletado) { return res.status(404).json({ sucesso: false, erro: "Item indisponível." }); }
    res.json({ sucesso: true, message: "Registro removido permanentemente." });
};

exports.verificarToken = async (req, res) => {
    res.json({ sucesso: true, mensagem: "Chave administrativa validada com sucesso." });
};