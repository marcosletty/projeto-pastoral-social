// Trava o calendário para não aceitar datas no passado
document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('data-entrega');
    if (inputData) {
        // Pega a data de hoje e formata para o padrão do HTML (AAAA-MM-DD)
        const dataHoje = new Date().toISOString().split('T')[0];
        inputData.setAttribute('min', dataHoje);
    }
});

function mudarAba(abaId) {
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
    document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));
    
    let index = 0;
    if(abaId === 'graficos') index = 1;
    if(abaId === 'cadastro') index = 2;
    
    document.querySelectorAll('.aba-btn')[index].classList.add('ativa');
    document.getElementById('aba-' + abaId).classList.add('ativa');
}

function mostrarAviso(mensagem) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `✅ ${mensagem}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

async function salvarDataEntrega() {
    let data = document.getElementById('data-entrega').value;
    if(data) {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chave: 'data_entrega', valor: data })
        });
        mostrarAviso("Data salva no servidor!");
        carregarAdmin(); 
    }
}

function atualizarDashboard(dados, dataSalva) {
    let inputData = document.getElementById('data-entrega');
    if(dataSalva) inputData.value = dataSalva;

    let diasFaltando = null;
    if (dataSalva) {
        let hoje = new Date();
        let entrega = new Date(dataSalva + 'T00:00:00'); 
        hoje.setHours(0,0,0,0);
        let diffTempo = entrega.getTime() - hoje.getTime();
        diasFaltando = Math.ceil(diffTempo / (1000 * 3600 * 24));
    }

    let totalIntencoes = 0;

    // LÓGICA DA OPÇÃO 3: Filtra, calcula o que falta, ordena e pega os 3 maiores
    let itensFaltantes = dados
        .map(item => {
            totalIntencoes += (item.intencoes || 0);
            return {
                nome: item.nome,
                faltam: item.meta - item.quantidade
            };
        })
        .filter(item => item.faltam > 0)
        .sort((a, b) => b.faltam - a.faltam) // Ordena do maior para o menor
        .slice(0, 3); // Corta para pegar apenas os top 3

    let htmlDashboard = '';
    
    if (itensFaltantes.length > 0) {
        // Monta o texto "Item (10), Item (5) e Item (2)"
        let prioridadesTexto = itensFaltantes.map(i => `${i.nome} (${i.faltam})`).join(', ');
        if (itensFaltantes.length > 1) {
            prioridadesTexto = prioridadesTexto.replace(/, ([^,]*)$/, ' e $1');
        }

        if (diasFaltando !== null && diasFaltando >= 0) {
            htmlDashboard += `<div class="card-alerta">⚠️ Faltam ${diasFaltando} dias para a entrega. Prioridades de arrecadação: ${prioridadesTexto}.</div>`;
        } else if (diasFaltando !== null && diasFaltando < 0) {
            htmlDashboard += `<div class="card-alerta">⚠️ A data de entrega já passou. Prioridades atrasadas: ${prioridadesTexto}.</div>`;
        } else {
            htmlDashboard += `<div class="card-alerta">⚠️ Prioridades de arrecadação: ${prioridadesTexto}. (Defina a data de entrega acima).</div>`;
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
                    <span style="color:#7f8c8d;">Estoque: <strong>${item.quantidade}</strong> | Promessas: <strong>${item.intencoes || 0}</strong> | Meta: ${item.meta}</span>
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
    const res = await fetch('/api/estoque');
    const dados = await res.json();
    
    const resConfig = await fetch('/api/config/data_entrega');
    const configData = await resConfig.json();
    const dataSalvaServidor = configData.valor;

    const div = document.getElementById('lista-admin');
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
            avisoCobertura = `<div class="cobertura-falta">⚠️ ${textoFalta} para fechar a meta do mês atual.</div>`;
        }

        // NOVO AGRUPAMENTO DE INTERFACE (UI)
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
                        <input type="number" id="mov-${item.id_item}" value="1" min="1" style="width: 60px; padding: 10px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.2em; font-weight: bold;">
                        <button class="btn-entrada" onclick="movimentar('${item.id_item}', 'entrada')" style="flex: 1; padding: 10px;">+</button>
                    </div>
                </div>

                <div class="bloco-acao-compacto" style="margin-bottom: 0; background: #fff; border: 1px dashed #bdc3c7;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="titulo-acao-pequeno" style="margin-bottom: 0;">🎯Meta Mensal:</span>
                            <input type="number" id="meta-${item.id_item}" value="${item.meta}" style="width: 70px; padding: 8px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1em; font-weight: bold;">
                        </div>
                        <button class="btn-salvar" onclick="salvarBalanco('${item.id_item}')" style="background: #00509e; padding: 8px 15px; height: auto;">Salvar Meta</button>
                    </div>
                </div>

            </div>
        `;
    });

    atualizarDashboard(dados, dataSalvaServidor);
}

async function adicionarProduto() {
    const nome = document.getElementById('novo-nome').value;
    const icone = document.getElementById('novo-icone').value;
    const meta = document.getElementById('novo-meta').value;
    if (!nome) return;
    await fetch('/api/admin/item', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, icone, meta })
    });
    document.getElementById('novo-nome').value = '';
    document.getElementById('novo-icone').value = '';
    mudarAba('estoque');
    mostrarAviso("Cadastrado!");
    carregarAdmin();
}

async function excluirProduto(id) {
    if(confirm('Tem certeza que deseja apagar permanentemente este alimento do sistema?')) {
        try {
            // Aguarda a resposta do servidor
            const resposta = await fetch(`/api/admin/item/${id}`, { method: 'DELETE' });
            
            // Só exibe sucesso se o servidor retornar um status de OK (ex: 200)
            if (resposta.ok) {
                mostrarAviso("Alimento apagado!");
                carregarAdmin(); // Recarrega a tabela de itens
            } else {
                // Caso a rota retorne um erro (como o 404 que configuramos)
                alert("Falha ao excluir. O alimento pode já ter sido apagado ou não existe.");
            }
        } catch (erro) {
            // Captura falhas de rede (ex: servidor caiu, usuário sem internet)
            console.error("Erro na requisição:", erro);
            alert("Erro de conexão com o servidor ao tentar excluir o alimento.");
        }
    }
}

async function salvarBalanco(id) {
    const qtd = document.getElementById(`qtd-${id}`).value;
    const meta = document.getElementById(`meta-${id}`).value;
    await fetch('/api/admin/atualizar', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantidade: qtd, meta })
    });
    mostrarAviso("Salvo!");
    carregarAdmin();
}

async function movimentar(id, operacao) {
    const valor = document.getElementById(`mov-${id}`).value;
    await fetch('/api/admin/movimentar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, valor, operacao })
    });
    mostrarAviso("Estoque atualizado!");
    carregarAdmin();
}

// Função para zerar o estoque com trava de segurança
async function zerarEstoque() {
    const confirmacao = prompt('ATENÇÃO: Isso vai zerar o estoque e as intenções de doação de TODOS os itens.\\n\\nPara confirmar, digite a palavra CONFIRMAR (tudo em maiúsculo):');

    if (confirmacao === 'CONFIRMAR') {
        try {
            // Chama a rota no backend para fazer a limpeza
            const resposta = await fetch('/api/zerar-estoque', { method: 'PUT' });
            
            if (resposta.ok) {
                alert('Sucesso! O estoque foi zerado para um novo ciclo.');
                window.location.reload(); // Recarrega a página para mostrar os itens zerados
            } else {
                alert('Ocorreu um erro ao tentar zerar o estoque.');
            }
        } catch (erro) {
            console.error('Erro de conexão:', erro);
            alert('Erro de conexão com o servidor.');
        }
    } else if (confirmacao !== null) {
        alert('Palavra incorreta. Ação cancelada por segurança.');
    }
}

// Inicializa a página
carregarAdmin();