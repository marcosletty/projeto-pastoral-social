// public/js/admin.js

const valoresMovimentacao = {};

async function validarTokenComServidor(token) {
    try {
        const resposta = await fetch('/api/admin/verificar', {
            method: 'GET',
            headers: { 'x-admin-token': token || '' }
        });
        return resposta.ok;
    } catch (e) {
        return false;
    }
}

async function solicitarSenhaMestre() {
    const { value: tokenInformado } = await Swal.fire({
        title: '🔒 Área Restrita',
        input: 'password',
        inputLabel: 'Por favor, forneça a Senha Administrativa:',
        inputPlaceholder: 'Digite a senha mestre...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: true,
        cancelButtonText: 'Voltar para o Site',
        confirmButtonColor: '#00509e',
        cancelButtonColor: '#7f8c8d'
    });

    if (!tokenInformado) {
        window.location.href = '/';
        return;
    }

    const valido = await validarTokenComServidor(tokenInformado);

    if (valido) {
        localStorage.setItem('adminToken', tokenInformado);
        localStorage.setItem('adminTokenTime', Date.now().toString());

        const container = document.querySelector('.container');
        if (container) container.style.display = 'block';

        Swal.fire({
            title: 'Autorizado!',
            text: 'Acesso garantido por 12 horas.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

        await carregarAdmin();
    } else {
        await Swal.fire({
            title: 'Chave Incorreta!',
            text: 'A senha informada não coincide com o servidor. Tente novamente.',
            icon: 'error',
            confirmButtonColor: '#00509e'
        });
        solicitarSenhaMestre();
    }
}

async function inicializarPainelAdmin() {
    const container = document.querySelector('.container');
    if (container) container.style.display = 'none';

    const TEMPO_LIMITE_MS = 12 * 60 * 60 * 1000;
    const tokenAtual = localStorage.getItem('adminToken');
    const timestampSalvo = localStorage.getItem('adminTokenTime');

    if (tokenAtual && timestampSalvo) {
        const tempoPassado = Date.now() - parseInt(timestampSalvo);
        if (tempoPassado < TEMPO_LIMITE_MS) {
            const valido = await validarTokenComServidor(tokenAtual);
            if (valido) {
                if (container) container.style.display = 'block';
                await carregarAdmin();
                return;
            }
        }
    }

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenTime');
    solicitarSenhaMestre();
}

async function requisicaoAdmin(url, opcoes = {}) {
    const tokenAtual = localStorage.getItem('adminToken');
    const timestampSalvo = localStorage.getItem('adminTokenTime');
    const TEMPO_LIMITE_MS = 12 * 60 * 60 * 1000;

    if (!tokenAtual || !timestampSalvo || (Date.now() - parseInt(timestampSalvo) > TEMPO_LIMITE_MS)) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenTime');
        window.location.href = '/';
        throw new Error("Sessão expirada.");
    }

    opcoes.headers = {
        ...opcoes.headers,
        'Content-Type': 'application/json',
        'x-admin-token': tokenAtual
    };

    const resposta = await fetch(url, opcoes);

    if (resposta.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenTime');
        window.location.href = '/';
        throw new Error("Acesso administrativo negado pelo servidor.");
    }

    return resposta;
}

// CENTRALIZAÇÃO DA INICIALIZAÇÃO: Executa estritamente uma única vez ao montar o DOM
document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('data-entrega');
    if (inputData) {
        const dataHoje = new Date().toISOString().split('T')[0];
        inputData.setAttribute('min', dataHoje);
    }
    inicializarPainelAdmin();
});

function mudarAba(abaId) {
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
    document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));

    let index = 0;
    if (abaId === 'graficos') index = 1;
    if (abaId === 'cadastro') index = 2;

    document.querySelectorAll('.aba-btn')[index].classList.add('ativa');
    document.getElementById('aba-' + abaId).classList.add('ativa');
}

function mostrarAviso(mensagem, status = 'sucesso') {
    const toast = document.getElementById('toast');
    if (status === 'erro') {
        toast.innerHTML = `❌ ${mensagem}`;
        toast.style.backgroundColor = '#e74c3c';
    } else {
        toast.innerHTML = `✅ ${mensagem}`;
        toast.style.backgroundColor = '#27ae60';
    }
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

async function salvarDataEntrega() {
    let data = document.getElementById('data-entrega').value;
    if (data) {
        try {
            await requisicaoAdmin('/api/config', {
                method: 'POST',
                body: JSON.stringify({ chave: 'data_entrega', valor: data })
            });
            mostrarAviso("Data limite registrada com sucesso!");
            await carregarAdmin();
        } catch (err) {
            mostrarAviso("Ocorreu um erro ao salvar a data.", "erro");
        }
    }
}

async function salvarNumeroFamilias() {
    let familias = document.getElementById('numero-familias').value;
    if (familias && familias > 0) {
        try {
            await requisicaoAdmin('/api/config', {
                method: 'POST',
                body: JSON.stringify({ chave: 'numero_familias', valor: familias })
            });
            mostrarAviso("Famílias salvas. Todas as metas foram recalculadas!");
            await carregarAdmin();
        } catch (err) {
            mostrarAviso("Ocorreu um erro ao salvar o número de famílias.", "erro");
        }
    }
}

function atualizarDashboard(dados, dataSalva) {
    let inputData = document.getElementById('data-entrega');
    if (dataSalva) inputData.value = dataSalva;

    let diasFaltando = null;
    if (dataSalva) {
        const [ano, mes, dia] = dataSalva.split('-');
        let entrega = new Date(ano, mes - 1, dia);
        let hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        let diffTempo = entrega.getTime() - hoje.getTime();
        diasFaltando = Math.ceil(diffTempo / (1000 * 3600 * 24));
    }

    let totalIntencoes = 0;

    let itensFaltantes = dados
        .map(item => {
            totalIntencoes += (item.intencoes || 0);
            return { nome: item.nome, faltam: item.meta - item.quantidade };
        })
        .filter(item => item.faltam > 0)
        .sort((a, b) => b.faltam - a.faltam)
        .slice(0, 3);

    let htmlDashboard = '';

    if (itensFaltantes.length > 0) {
        let prioridadesTexto = itensFaltantes.map(i => `${i.nome} (${i.faltam})`).join(', ');
        if (itensFaltantes.length > 1) {
            prioridadesTexto = prioridadesTexto.replace(/, ([^,]*)$/, ' e $1');
        }

        if (diasFaltando !== null && diasFaltando >= 0) {
            htmlDashboard += `<div class="card-alerta">⚠️ Faltam ${diasFaltando} dias para a entrega. Prioridades de arrecadação: ${prioridadesTexto}.</div>`;
        } else if (diasFaltando !== null && diasFaltando < 0) {
            htmlDashboard += `<div class="card-alerta">⚠️ A data estipulada de entrega já expirou. Prioridades em atraso: ${prioridadesTexto}.</div>`;
        } else {
            htmlDashboard += `<div class="card-alerta">⚠️ Prioridades de arrecadação: ${prioridadesTexto}. (Defina a data limite acima).</div>`;
        }
    } else {
        htmlDashboard += `<div class="card-sucesso">✅ Todas as metas do mês foram atingidas!</div>`;
    }

    htmlDashboard += `<div class="card-info">🤝 Promessas de doação geradas no site: <strong>${totalIntencoes} itens</strong></div>`;
    htmlDashboard += `<h4 style="color:#2c3e50; border-bottom: 2px solid #eee; padding-bottom: 5px;">Progresso Físico vs Promessas</h4>`;

    dados.forEach(item => {
        let percEstoque = Math.min((item.quantidade / item.meta) * 100, 100);
        let percPromessa = Math.min(((item.intencoes || 0) / item.meta) * 100, 100 - percEstoque);

        htmlDashboard += `
            <div style="margin-bottom: 18px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.95em;">
                    <strong>${item.icone} ${item.nome}</strong>
                    <span style="color:#7f8c8d;">Estoque: <strong>${item.quantidade}</strong> | Promessas: <strong>${item.intencoes || 0}</strong> | Meta: ${item.meta} (Cesta: ${item.por_cesta || 1})</span>
                </div>
                <div class="barra-fundo">
                    <div class="barra-estoque" style="width: ${percEstoque}%;"></div>
                    <div class="barra-promessa" style="width: ${percPromessa}%;"></div>
                </div>
            </div>
        `;
    });

    document.getElementById('dashboard-conteudo').innerHTML = htmlDashboard;
}

async function carregarAdmin() {
    try {
        const res = await fetch('/api/estoque', { cache: 'no-store' });
        const dados = await res.json();

        const resConfig = await fetch('/api/config/data_entrega', { cache: 'no-store' });
        const configData = await resConfig.json();
        const dataSalvaServidor = configData.valor;

        const resFamilias = await fetch('/api/config/numero_familias', { cache: 'no-store' });
        const configFamilias = await resFamilias.json();
        if (configFamilias.valor) {
            const inputFamilias = document.getElementById('numero-familias');
            if (inputFamilias) inputFamilias.value = configFamilias.valor;
        }

        document.querySelectorAll('input[id^="mov-"]').forEach(input => {
            const idItem = input.id.replace('mov-', '');
            valoresMovimentacao[idItem] = input.value;
        });

        const div = document.getElementById('lista-admin');
        if (!div) return;
        div.innerHTML = '';

        dados.forEach(item => {
            let mesesGarantidos = Math.floor(item.quantidade / item.meta);
            let sobra = item.quantidade % item.meta;
            let avisoCobertura = '';

            if (mesesGarantidos >= 1) {
                let textoSobra = '';
                if (sobra === 0) textoSobra = 'Na medida exata, sem sobras';
                else if (sobra === 1) textoSobra = 'Sobra 1 unidade para o próximo mês';
                else textoSobra = `Sobram ${sobra} unidades para o próximo mês`;
                let textoMeses = mesesGarantidos === 1 ? 'mês completo' : 'meses completos';
                avisoCobertura = `<div class="cobertura-ok">📈 Estoque garante ${mesesGarantidos} ${textoMeses}! <br><small>(${textoSobra})</small></div>`;
            } else {
                let faltam = item.meta - item.quantidade;
                let textoFalta = faltam === 1 ? 'Falta 1 unidade' : `Faltam ${faltam} unidades`;
                avisoCobertura = `<div class="cobertura-falta">⚠️ ${textoFalta} para fechar a meta atual.</div>`;
            }

            let valorInputSalvo = valoresMovimentacao[item.id_item] || "1";

            div.innerHTML += `
                <div class="card-item">
                    <div class="card-header">
                        <div class="item-nome">
                            ${item.icone} ${item.nome} 
                            <span style="font-size:0.6em; color:#7f8c8d; font-weight:normal;">(Promessas: ${item.intencoes || 0})</span>
                        </div>
                        <button class="btn-icon-excluir" onclick="excluirProduto('${item.id_item}')" title="Apagar Alimento">🗑️</button>
                    </div>
                    
                    ${avisoCobertura}
                    
                    <div class="bloco-acao-compacto">
                        <span class="titulo-acao-pequeno">Estoque e Movimentação</span>
                        
                        <div style="display: flex; gap: 15px; margin-bottom: 15px; align-items: flex-end;">
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <small style="color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">Total no estoque:</small>
                                <input type="number" id="qtd-${item.id_item}" value="${item.quantidade}" style="width: 100%; padding: 10px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1em; font-weight: bold;">
                            </div>
                            <button class="btn-salvar" onclick="salvarBalanco('${item.id_item}')" style="padding: 10px 15px; height: 44px;">Atualizar</button>
                        </div>

                        <div style="display: flex; gap: 10px; align-items: center; width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                            <button class="btn-saida" onclick="movimentar('${item.id_item}', 'saida')" style="flex: 1; padding: 10px;">-</button>
                            <input type="number" id="mov-${item.id_item}" value="${valorInputSalvo}" min="1" style="width: 60px; padding: 10px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.2em; font-weight: bold;">
                            <button class="btn-entrada" onclick="movimentar('${item.id_item}', 'entrada')" style="flex: 1; padding: 10px;">+</button>
                        </div>
                    </div>

                    <div class="bloco-acao-compacto" style="margin-bottom: 0; background: #fff; border: 1px dashed #bdc3c7;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="titulo-acao-pequeno" style="margin-bottom: 0;">🎯 Quantidade por Cesta:</span>
                                <input type="number" id="por-cesta-${item.id_item}" value="${item.por_cesta || 1}" min="1" style="width: 50px; padding: 8px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1em; font-weight: bold;">
                            </div>
                            <button class="btn-salvar" onclick="salvarPorCesta('${item.id_item}')" style="background: #00509e; padding: 8px 15px; height: auto;">Salvar</button>
                        </div>
                    </div>
                </div>
            `;
        });

        atualizarDashboard(dados, dataSalvaServidor);
    } catch (err) {
        console.error("Falha ao recuperar dados:", err);
    }
}

async function adicionarProduto() {
    const nome = document.getElementById('novo-nome').value;
    const icone = document.getElementById('novo-icone').value;
    const por_cesta = document.getElementById('novo-por-cesta').value;
    if (!nome) return;

    try {
        const resposta = await requisicaoAdmin('/api/admin/item', {
            method: 'POST', body: JSON.stringify({ nome, icone, por_cesta })
        });
        const respostaJSON = await resposta.json();

        if (!resposta.ok) throw new Error(respostaJSON.erro || "Falha desconhecida.");

        document.getElementById('novo-nome').value = '';
        document.getElementById('novo-icone').value = '';
        document.getElementById('novo-por-cesta').value = '1';
        mudarAba('estoque');
        mostrarAviso("Item cadastrado com sucesso!");
        await carregarAdmin();
    } catch (err) {
        mostrarAviso(err.message, "erro");
    }
}

async function excluirProduto(id) {
    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação apagará este alimento permanentemente do sistema!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, apagar!',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const resposta = await requisicaoAdmin(`/api/admin/item/${id}`, { method: 'DELETE' });
            const respostaJSON = await resposta.json();

            if (resposta.ok) {
                mostrarAviso("Alimento removido com sucesso!");
                await carregarAdmin();
            } else {
                Swal.fire('Erro!', respostaJSON.erro || 'Falha ao apagar.', 'error');
            }
        } catch (erro) {
            Swal.fire('Erro de Conexão', 'Não foi possível completar a ação.', 'error');
        }
    }
}

async function salvarBalanco(id) {
    const qtd = document.getElementById(`qtd-${id}`).value;
    const por_cesta = document.getElementById(`por-cesta-${id}`).value;

    if (qtd.trim() === "" || por_cesta.trim() === "") {
        mostrarAviso("Quantidade e valor por cesta não podem ficar em branco.", "erro");
        return;
    }

    try {
        const resposta = await requisicaoAdmin('/api/admin/atualizar', {
            method: 'PUT', body: JSON.stringify({ id, quantidade: qtd, por_cesta })
        });
        const respostaJSON = await resposta.json();

        if (!resposta.ok) throw new Error(respostaJSON.erro);

        mostrarAviso("Estoque balanceado com sucesso!");
        await carregarAdmin();
    } catch (err) {
        mostrarAviso(err.message, "erro");
    }
}

async function salvarPorCesta(id) {
    const qtd = document.getElementById(`qtd-${id}`).value;
    const por_cesta = document.getElementById(`por-cesta-${id}`).value;

    if (qtd.trim() === "" || por_cesta.trim() === "") {
        mostrarAviso("Os campos não podem ficar vazios.", "erro");
        return;
    }

    try {
        const resposta = await requisicaoAdmin('/api/admin/atualizar', {
            method: 'PUT', body: JSON.stringify({ id, quantidade: qtd, por_cesta })
        });
        const respostaJSON = await resposta.json();

        if (!resposta.ok) throw new Error(respostaJSON.erro);

        mostrarAviso("Quantidade por cesta atualizada!");
        await carregarAdmin();
    } catch (err) {
        mostrarAviso(err.message, "erro");
    }
}

async function movimentar(id, operacao) {
    const valor = document.getElementById(`mov-${id}`).value;
    if (valor.trim() === "") {
        mostrarAviso("Preencha um valor válido para movimentação.", "erro");
        return;
    }

    try {
        const resposta = await requisicaoAdmin('/api/admin/movimentar', {
            method: 'POST', body: JSON.stringify({ id, valor, operacao })
        });
        const respostaJSON = await resposta.json();

        if (!resposta.ok) throw new Error(respostaJSON.erro);

        mostrarAviso("Movimentação contabilizada com sucesso!");
        await carregarAdmin();
    } catch (err) {
        mostrarAviso(err.message, "erro");
    }
}

async function registrarEntregaCestas() {
    const { value: cestas } = await Swal.fire({
        title: 'Registrar Entrega',
        text: 'Quantas cestas foram montadas e entregues hoje?',
        input: 'number',
        inputAttributes: { min: 1, step: 1 },
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#27ae60',
        cancelButtonColor: '#7f8c8d',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Confirmar Baixa'
    });

    if (cestas && cestas > 0) {
        try {
            const resposta = await requisicaoAdmin('/api/admin/entregar-cestas', {
                method: 'POST',
                body: JSON.stringify({ cestas_entregues: cestas })
            });

            if (resposta.ok) {
                await Swal.fire('Sucesso!', `O estoque foi atualizado. Alimentos referentes a ${cestas} cestas foram deduzidos.`, 'success');
                await carregarAdmin(); // Recarrega a listagem visual imediatamente
            } else {
                const json = await resposta.json();
                Swal.fire('Falha', json.erro || 'Não foi possível completar a baixa.', 'error');
            }
        } catch (erro) {
            Swal.fire('Erro', 'Problema de comunicação com o servidor.', 'error');
        }
    }
}

async function zerarEstoque() {
    const { value: palavra } = await Swal.fire({
        title: 'Zerar Estoque Físico',
        text: 'Digite CONFIRMAR para resetar o estoque e iniciar um novo mês.',
        input: 'text',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar'
    });

    if (palavra === 'CONFIRMAR') {
        try {
            const resposta = await requisicaoAdmin('/api/zerar-estoque', { method: 'PUT' });
            if (resposta.ok) {
                await Swal.fire('Sucesso!', 'Estoque zerado.', 'success');
                window.location.reload();
            } else {
                const json = await resposta.json();
                Swal.fire('Falha', json.erro || 'Não foi possível completar.', 'error');
            }
        } catch (erro) { Swal.fire('Erro', 'Problema de conexão.', 'error'); }
    } else if (palavra) {
        Swal.fire('Cancelado', 'Palavra incorreta.', 'info');
    }
}

async function zerarIntencoes() {
    const { value: palavra } = await Swal.fire({
        title: 'Zerar Intenções de Doação',
        text: 'Digite LIMPAR para resetar apenas as intenções geradas no site.',
        input: 'text',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f39c12',
        cancelButtonText: 'Cancelar'
    });

    if (palavra === 'LIMPAR') {
        try {
            const resposta = await requisicaoAdmin('/api/zerar-intencoes', { method: 'PUT' });
            if (resposta.ok) {
                await Swal.fire('Sucesso!', 'Métricas de intenções zeradas.', 'success');
                window.location.reload();
            } else {
                const json = await resposta.json();
                Swal.fire('Falha', json.erro || 'Não foi possível completar.', 'error');
            }
        } catch (erro) { Swal.fire('Erro', 'Problema de conexão.', 'error'); }
    } else if (palavra) {
        Swal.fire('Cancelado', 'Palavra incorreta.', 'info');
    }
}