module.exports = (req, res, next) => {
    // Intercepta a chave enviada no cabeçalho customizado da requisição
    const tokenEnviado = req.headers['x-admin-token'];
    
    // Se não configurar a variável ADMIN_TOKEN no .env, usará uma padrão segura temporária
    const tokenCorreto = process.env.ADMIN_TOKEN || 'paroquia-segura-2026';

    if (!tokenEnviado || tokenEnviado !== tokenCorreto) {
        const erroAuth = new Error('Operação negada. Chave de autenticação administrativa inválida ou ausente.');
        erroAuth.status = 401; // Unauthorized
        return next(erroAuth);
    }
    
    next(); // Chave válida, prossegue para a rota desejada
};