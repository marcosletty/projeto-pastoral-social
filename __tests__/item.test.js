// tests/item.test.js

const request = require('supertest');
const app = require('../server');
const Item = require('../models/Item');

// 1. Simular a ligação à base de dados para evitar conectar ao MongoDB real
jest.mock('../config/database', () => jest.fn());

// 2. Simular as respostas do Mongoose
jest.mock('../models/Item');
jest.mock('../models/Config');

describe('Testes de Integração da API - Pastoral Social', () => {

    const tokenSeguro = process.env.ADMIN_TOKEN || 'paroquia-segura-2026';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa as simulações após cada teste
    });

    // --- TESTES DE ROTAS PÚBLICAS ---

    it('Deve retornar a lista de alimentos publicamente (GET /api/estoque)', async () => {
        Item.find.mockResolvedValue([{ nome: 'Arroz', quantidade: 10, meta: 50 }]);
        const resposta = await request(app).get('/api/estoque');

        expect(resposta.status).toBe(200);
        expect(resposta.body.length).toBe(1);
        expect(resposta.body[0].nome).toBe('Arroz');
    });

    // --- TESTES DA NOVA ROTA DE VERIFICAÇÃO (HANDSHAKE) ---

    it('Deve recusar a validação de acesso se o token for incorreto (GET /api/admin/verificar)', async () => {
        const resposta = await request(app)
            .get('/api/admin/verificar')
            .set('x-admin-token', 'senha-inventada-e-errada');

        expect(resposta.status).toBe(401);
        expect(resposta.body.erro).toMatch(/Operação negada/);
    });

    it('Deve confirmar o acesso se o token fornecido for o correto (GET /api/admin/verificar)', async () => {
        const resposta = await request(app)
            .get('/api/admin/verificar')
            .set('x-admin-token', tokenSeguro);

        expect(resposta.status).toBe(200);
        expect(resposta.body.sucesso).toBe(true);
        expect(resposta.body.mensagem).toMatch(/validada com sucesso/);
    });

    // --- TESTES DE MANIPULAÇÃO DE DADOS ---

    it('Deve bloquear acesso não autorizado a rotas administrativas (POST /api/admin/item)', async () => {
        const resposta = await request(app)
            .post('/api/admin/item')
            .send({ nome: 'Feijão', meta: 20 });

        expect(resposta.status).toBe(401);
    });

    it('Deve bloquear a criação de um item com dados inválidos (Meta negativa)', async () => {
        const resposta = await request(app)
            .post('/api/admin/item')
            .set('x-admin-token', tokenSeguro)
            .send({ nome: 'Leite', meta: -5 });

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toBe('A meta deve ser um número maior que zero.');
    });

    it('Deve permitir criar um novo item se o token for válido e os dados corretos', async () => {
        Item.prototype.save = jest.fn().mockResolvedValue(true);

        const resposta = await request(app)
            .post('/api/admin/item')
            .set('x-admin-token', tokenSeguro)
            .send({ nome: 'Leite em Pó', meta: 30, icone: '🥛' });

        expect(resposta.status).toBe(200);
        expect(resposta.body.sucesso).toBe(true);
    });
});