module.exports = (req, res, next) => {
    const tokenEnviado = req.headers['x-admin-token'];
    const tokenCorreto = process.env.ADMIN_TOKEN; // Sem fallback para senhas hardcoded!

    // Trava de segurança: Se o servidor não foi configurado corretamente
    if (!tokenCorreto) {
        console.error("ALERTA CRÍTICO: ADMIN_TOKEN não foi configurado no arquivo .env!");
        const erroAuth = new Error('Erro interno de configuração do servidor.');
        erroAuth.status = 500;
        return next(erroAuth);
    }

    if (!tokenEnviado || tokenEnviado !== tokenCorreto) {
        const erroAuth = new Error('Operação negada. Chave administrativa inválida.');
        erroAuth.status = 401;
        return next(erroAuth);
    }
    
    next();
};