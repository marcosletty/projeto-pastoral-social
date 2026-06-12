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
    const { nome, por_cesta, icone } = req.body;
    
    // Busca o número atual de famílias para calcular a meta de largada
    const configFamilias = await Config.findOne({ chave: 'numero_familias' });
    const familias = configFamilias ? Number(configFamilias.valor) : 1;
    const metaCalculada = Number(por_cesta) * familias;

    let idAutomacao = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    
    const novoItem = new Item({ 
        id_item: idAutomacao, 
        nome, 
        por_cesta: Number(por_cesta),
        meta: metaCalculada,
        icone: icone || "📦" 
    });
    await novoItem.save();
    res.json({ sucesso: true });
};

exports.atualizarItem = async (req, res) => {
    verificarErros(req);
    const { id, quantidade, por_cesta } = req.body;
    
    const configFamilias = await Config.findOne({ chave: 'numero_familias' });
    const familias = configFamilias ? Number(configFamilias.valor) : 1;
    const metaCalculada = Number(por_cesta) * familias;

    const item = await Item.findOneAndUpdate(
        { id_item: id }, 
        { quantidade: Number(quantidade), por_cesta: Number(por_cesta), meta: metaCalculada },
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
    
    // SE MUDAR O NÚMERO DE FAMÍLIAS: Varre e atualiza a meta de todos os itens atomicamente
    if (chave === 'numero_familias') {
        const familias = Number(valor);
        const itens = await Item.find();
        for (let item of itens) {
            item.meta = (item.por_cesta || 1) * familias;
            await item.save();
        }
    }
    
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

exports.entregarCestas = async (req, res) => {
    verificarErros(req);
    const { cestas_entregues } = req.body;
    const numeroCestas = Number(cestas_entregues);

    const itens = await Item.find();
    
    // Varre todo o estoque e aplica a subtração
    for (let item of itens) {
        const totalDescontar = (item.por_cesta || 1) * numeroCestas;
        // Math.max garante que, se o desconto for maior que o estoque, ele zere, mas nunca fique negativo
        item.quantidade = Math.max(0, item.quantidade - totalDescontar);
        await item.save();
    }

    res.json({ sucesso: true, mensagem: 'Estoque atualizado após entrega.' });
};

exports.verificarToken = async (req, res) => {
    res.json({ sucesso: true, mensagem: "Senha validada com sucesso." });
};