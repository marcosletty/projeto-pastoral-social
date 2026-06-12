require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const conectarBanco = require('./config/database');
const rotasItens = require('./routes/itemRoutes');
const path = require('path');

const app = express();
const porta = process.env.PORT || 3000;

// Permite que o Rate Limiter identifique o IP real do utilizador atrás da Vercel
app.set('trust proxy', 1);

// 1. Segurança de Cabeçalhos HTTP com Helmet
app.use(helmet({
    contentSecurityPolicy: false // Permite simplificar o carregamento de scripts locais/inline
}));

// 2. Proteção contra ataques de força bruta ou estouro de requisições (Rate Limiting)
const limitadorAPI = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 100, // Limite máximo de 100 requisições por IP
    message: { erro: 'Muitas requisições originadas deste IP. Tente novamente mais tarde.' }
});
app.use('/api/', limitadorAPI);

// Configurações Base
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints de Páginas Estáticas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Inicialização de Dados
conectarBanco();

// Barramento de Rotas Operacionais
app.use('/api', rotasItens);

// 3. Middleware Centralizado de Erros (Captura erros lançados em qualquer rota)
app.use((err, req, res, next) => {
    console.error('❌ Erro de Sistema interceptado:', err.message);
    const codigoStatus = err.status || 500;
    res.status(codigoStatus).json({
        sucesso: false,
        erro: err.message || 'Ocorreu uma falha interna no processamento da requisição.'
    });
});

// Ativação da Aplicação
app.use((req, res) => {
    // Se a requisição foi feita para a API, devolve JSON de erro
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ sucesso: false, erro: 'Endpoint de API não encontrado.' });
    } else {
        // Se foi um usuário digitando URL errada, devolve texto ou página HTML
        res.status(404).send('Página não encontrada.');
    }
});

if (require.main === module) {
    app.listen(porta, () => {
        console.log(`🚀 Sistema Online Profissional! Acesse: http://localhost:${porta}`);
    });
}

module.exports = app;