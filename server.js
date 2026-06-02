require('dotenv').config();
const express = require('express');
const conectarBanco = require('./config/database');
const rotasItens = require('./routes/itemRoutes');

const app = express();
const porta = process.env.PORT || 3000;

// Configurações base
app.use(express.json());
app.use(express.static('public'));

// Inicia a conexão com o MongoDB Atlas
conectarBanco();

// Acopla todas as rotas da API
app.use('/api', rotasItens);

// Inicia o servidor
app.listen(porta, () => {
    console.log(`🚀 Sistema Online! Acesse: http://localhost:${porta}`);
});