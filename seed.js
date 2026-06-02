require('dotenv').config();
const mongoose = require('mongoose');

// O mesmo "Molde" que usamos no server.js
const itemSchema = new mongoose.Schema({
    id_item: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 0 },
    meta: { type: Number, required: true },
    icone: { type: String }
});

const Item = mongoose.model('Item', itemSchema);

// Nossa lista essencial da Cesta Básica
const estoqueInicial = [
    { id_item: "arroz", nome: "Arroz (5kg)", quantidade: 12, meta: 50, icone: "🌾" },
    { id_item: "feijao", nome: "Feijão (1kg)", quantidade: 25, meta: 50, icone: "🫘" },
    { id_item: "oleo", nome: "Óleo de Soja", quantidade: 8, meta: 50, icone: "🌻" },
    { id_item: "macarrao", nome: "Macarrão", quantidade: 40, meta: 50, icone: "🍝" },
    { id_item: "acucar", nome: "Açúcar (1kg)", quantidade: 15, meta: 50, icone: "🍚" },
    { id_item: "cafe", nome: "Café (500g)", quantidade: 5, meta: 50, icone: "☕" }
];

async function semearBanco() {
    try {
        console.log("⏳ Conectando ao MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado com sucesso!");

        console.log("🧹 Limpando dados antigos (se houver)...");
        await Item.deleteMany({}); // Garante que não teremos itens duplicados

        console.log("🌱 Semeando o estoque inicial na nuvem...");
        await Item.insertMany(estoqueInicial);
        console.log("✨ Estoque inicial criado com sucesso na Pastoral Social!");

        // Fecha a conexão para encerrar o script
        mongoose.connection.close();
        process.exit();
    } catch (erro) {
        console.error("❌ Erro ao semear o banco:", erro);
        process.exit(1);
    }
}

semearBanco();