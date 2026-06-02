const mongoose = require('mongoose');

const conectarBanco = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Servidor conectado ao MongoDB da Pastoral!');
    } catch (erro) {
        console.error('❌ Erro ao conectar no MongoDB:', erro);
        process.exit(1); // Derruba o servidor se o banco falhar (Prática de segurança)
    }
};

module.exports = conectarBanco;