// utils/asyncHandler.js
// Esta função "embrulha" suas rotas e captura erros silenciosos
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;