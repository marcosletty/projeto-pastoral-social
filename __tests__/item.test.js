// __tests__/item.test.js

const request = require('supertest');
const app = require('../server');
const Item = require('../models/Item');

jest.mock('../config/database', () => jest.fn());
jest.mock('../models/Item');
jest.mock('../models/Config');

describe('Testes de Integração da API - Pastoral Social', () => {

    const tokenSeguro = process.env.ADMIN_TOKEN || 'paroquia-segura-2026';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Deve retornar a lista de alimentos publicamente (GET /api/estoque)', async () => {
        Item.find.mockResolvedValue([{ nome: 'Arroz', quantidade: 10, por_cesta: 2, meta: 100 }]);
        const resposta = await request(app).get('/api/estoque');

        expect(resposta.status).toBe(200);
        expect(resposta.body.length).toBe(1);
        expect(resposta.body[0].nome).toBe('Arroz');
    });

    it('Deve recusar a validação de acesso se o token for incorreto (GET /api/admin/verificar)', async () => {
        const resposta = await request(app)
            .get('/api/admin/verificar')
            .set('x-admin-token', 'senha-errada');

        expect(resposta.status).toBe(401);
    });

    it('Deve confirmar o acesso se o token fornecido for o correto (GET /api/admin/verificar)', async () => {
        const resposta = await request(app)
            .get('/api/admin/verificar')
            .set('x-admin-token', tokenSeguro);

        expect(resposta.status).toBe(200);
        expect(resposta.body.sucesso).toBe(true);
    });

    it('Deve bloquear acesso não autorizado a rotas administrativas (POST /api/admin/item)', async () => {
        const resposta = await request(app)
            .post('/api/admin/item')
            .send({ nome: 'Feijão', por_cesta: 2 });

        expect(resposta.status).toBe(401);
    });

    it('Deve bloquear a criação de um item com dados inválidos (Quantidade por cesta negativa)', async () => {
        const resposta = await request(app)
            .post('/api/admin/item')
            .set('x-admin-token', tokenSeguro)
            .send({ nome: 'Leite', por_cesta: -2 });

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toBe('A quantidade por cesta deve ser um número maior que zero.');
    });

    it('Deve permitir criar um novo item se o token for válido e os dados corretos', async () => {
        Item.prototype.save = jest.fn().mockResolvedValue(true);

        const resposta = await request(app)
            .post('/api/admin/item')
            .set('x-admin-token', tokenSeguro)
            .send({ nome: 'Leite em Pó', por_cesta: 2, icone: '🥛' });

        expect(resposta.status).toBe(200);
        expect(resposta.body.sucesso).toBe(true);
    });

    it('Deve deduzir o estoque ao registrar entrega de cestas (POST /api/admin/entregar-cestas)', async () => {
        // Simulamos o Mongoose devolvendo um array com função .save() para um item
        Item.find.mockResolvedValue([
            { nome: 'Arroz', quantidade: 10, por_cesta: 2, save: jest.fn().mockResolvedValue(true) }
        ]);

        const resposta = await request(app)
            .post('/api/admin/entregar-cestas')
            .set('x-admin-token', tokenSeguro)
            .send({ cestas_entregues: 3 });

        expect(resposta.status).toBe(200);
        expect(resposta.body.sucesso).toBe(true);
    });
});