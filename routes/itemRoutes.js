const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const itemController = require('../controllers/itemController.js');
const asyncHandler = require('../utils/asyncHandler.js');
const authMiddleware = require('../middlewares/auth.js');

// ----------------------------------------------------
// ROTAS PÚBLICAS
// ----------------------------------------------------
router.get('/estoque', asyncHandler(itemController.listarEstoque));
router.get('/config/:chave', asyncHandler(itemController.obterConfig));

router.post('/publico/intencao', [
    body('id').notEmpty().withMessage('O ID do item é obrigatório.').trim().escape()
], asyncHandler(itemController.registrarIntencao));

// ----------------------------------------------------
// ROTAS PRIVADAS (Protegidas por Senha)
// ----------------------------------------------------
router.get('/admin/verificar', authMiddleware, asyncHandler(itemController.verificarToken)); // NOVA ROTA DE SEGUURANÇA
router.post('/admin/item', authMiddleware, [
    body('nome').notEmpty().withMessage('O nome é obrigatório.').trim().escape(),
    body('meta').isInt({ gt: 0 }).withMessage('A meta deve ser um número maior que zero.'),
    body('icone').optional().trim()
], asyncHandler(itemController.criarItem));

router.put('/admin/atualizar', authMiddleware, [
    body('id').notEmpty().trim().escape(),
    body('quantidade').isInt({ min: 0 }).withMessage('A quantidade não pode ser negativa.'),
    body('meta').isInt({ gt: 0 }).withMessage('A meta deve ser maior que zero.')
], asyncHandler(itemController.atualizarItem));

router.post('/admin/movimentar', authMiddleware, [
    body('id').notEmpty().trim().escape(),
    body('valor').isInt({ gt: 0 }).withMessage('O valor de movimentação deve ser maior que zero.'),
    body('operacao').isIn(['entrada', 'saida']).withMessage('Operação inválida.')
], asyncHandler(itemController.movimentarEstoque));

router.post('/config', authMiddleware, [
    body('chave').notEmpty().trim().escape(),
    body('valor').notEmpty().trim().escape()
], asyncHandler(itemController.salvarConfig));

router.put('/zerar-estoque', authMiddleware, asyncHandler(itemController.zerarEstoque));
router.put('/zerar-intencoes', authMiddleware, asyncHandler(itemController.zerarIntencoes));

router.delete('/admin/item/:id', authMiddleware, [
    param('id').notEmpty().trim().escape()
], asyncHandler(itemController.excluirItem));

module.exports = router;