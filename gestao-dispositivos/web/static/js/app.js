const API_URL = window.location.origin;

// ==========================================
// VARIÁVEIS GLOBAIS DE CACHE
// ==========================================
let aparelhosCache = [];
let colabCache = [];
let filtroAtual = 'todos';
let donutChart = null;

// ==========================================
// UTILITÁRIOS E COMPONENTES VISUAIS
// ==========================================
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_URL + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { erro: 'Sem conexão com a API' } };
  }
}

function badgeStatus(status) {
  const map = {
    'Disponível': '<span class="badge badge-disp">DISPONÍVEL</span>',
    'Em Uso':     '<span class="badge badge-uso">EM USO</span>',
    'Manutenção': '<span class="badge badge-mnt">MANUTENÇÃO</span>',
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

function badgeTipo(tipo) {
  if (!tipo) return '-';
  if (tipo.toLowerCase().includes('devolução')) return '<span class="badge" style="background: rgba(255, 68, 68, 0.1); color: var(--red); border-color: var(--red);">DEVOLUÇÃO</span>';
  return '<span class="badge" style="background: rgba(0, 229, 255, 0.1); color: var(--cyan); border-color: var(--cyan);">SAÍDA</span>';
}

function setMsg(id, texto, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = 'form-msg ' + (tipo === 'ok' ? 'ok' : 'err');
  if (tipo === 'ok') setTimeout(() => { el.textContent = ''; }, 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function atualizarStatusConexao(online) {
  const txt = document.getElementById('statusTxt');
  const dot = document.querySelector('.live-dot');
  if (!txt || !dot) return;

  if (online) {
    txt.textContent = 'SISTEMA ONLINE';
    dot.style.background = '#39d353';
    dot.style.boxShadow = '0 0 10px #39d353';
  } else {
    txt.textContent = 'OFFLINE / ERRO';
    dot.style.background = '#ff4444';
    dot.style.boxShadow = '0 0 10px #ff4444';
  }
}

// ==========================================
// DASHBOARD E GRÁFICOS
// ==========================================
async function carregarCards() {
  const { ok, data } = await apiFetch('/aparelhos');
  if (!ok) return;

  const total = data.length;
  const disponiveis = data.filter(a => a.status === 'Disponível').length;
  const emUso = data.filter(a => a.status === 'Em Uso').length;
  const manutencao = data.filter(a => a.status === 'Manutenção').length;

  document.getElementById('totalAparelhos').textContent = total;
  document.getElementById('totalDisponiveis').textContent = disponiveis;
  document.getElementById('totalEmUso').textContent = emUso;
  document.getElementById('totalManutencao').textContent = manutencao;
  
  const totalDetalhe = document.getElementById('totalDetalhe');
  if(totalDetalhe) totalDetalhe.textContent = total + ' ativos em inventário';

  atualizarGraficoDonut(disponiveis, emUso, manutencao);
}

function atualizarGraficoDonut(disp, uso, mnt) {
  const ctx = document.getElementById('dChart');
  if (!ctx) return;
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Disponível', 'Em Uso', 'Manutenção'],
      datasets: [{
        data: [disp, uso, mnt],
        backgroundColor: ['#39d353', '#f0a500', '#ff4444'],
        borderColor: '#0f0f0f',
        borderWidth: 3
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// ==========================================
// GESTÃO DE EQUIPAMENTOS (CRUD)
// ==========================================
window.mudarFormularioCadastro = function() {
  const cat = document.getElementById('fCat').value;
  document.getElementById('blocoImei').style.display = (cat === 'Celular') ? 'block' : 'none';
  document.getElementById('blocoNotebook').style.display = (cat === 'Notebook') ? 'block' : 'none';
  document.getElementById('blocoPeriferico').style.display = (cat === 'Periférico') ? 'block' : 'none';
};

async function carregarAparelhos() {
  const tbody = document.getElementById('tbodyAparelhos');
  const selSaidaAtivo = document.getElementById('fSaidaAparelho');
  const selDevAtivo = document.getElementById('fDevAparelho');

  if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading-row">CARREGANDO...</td></tr>';

  const { ok, data } = await apiFetch('/aparelhos');
  if (ok) {
    aparelhosCache = data;
    renderizarAparelhos(data);

    // Preenche o Select de Saída apenas com os DISPONÍVEIS
    if (selSaidaAtivo) {
      const disponiveis = data.filter(a => a.status === 'Disponível');
      selSaidaAtivo.innerHTML = '<option value="">-- selecione um ativo disponível --</option>' + 
        disponiveis.map(a => `<option value="${a.id}">#${a.id} - ${a.modelo} (${a.numero_serie})</option>`).join('');
    }

    // Preenche o Select de Devolução apenas com os EM USO
    if (selDevAtivo) {
      const emUso = data.filter(a => a.status === 'Em Uso');
      selDevAtivo.innerHTML = '<option value="">-- selecione um ativo em uso --</option>' + 
        emUso.map(a => `<option value="${a.id}">#${a.id} - ${a.modelo} (${a.numero_serie})</option>`).join('');
    }
  }
}

function renderizarAparelhos(lista) {
  const tbody = document.getElementById('tbodyAparelhos');
  if (!tbody) return;
  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>#${String(a.id).padStart(3,'0')}</td>
      <td style="color: var(--cyan); font-weight: bold;">${(a.categoria || 'Celular').toUpperCase()}</td>
      <td>${a.modelo}</td>
      <td>${a.numero_serie}</td>
      <td>${badgeStatus(a.status)}</td>
      <td>
        <button class="btn-link" onclick="abrirDetalhes(${a.id})">VER</button> |
        <button class="btn-link" style="color: var(--amber);" onclick="editarAparelho(${a.id})">EDITAR</button> |
        <button class="btn-link" style="color: var(--red);" onclick="excluirAparelho(${a.id})">EXCLUIR</button>
      </td>
    </tr>
  `).join('');
}

window.filtAparelhos = function(status, btn) {
  filtroAtual = status;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  let lista = (status === 'todos') ? aparelhosCache : aparelhosCache.filter(a => a.status === status);
  renderizarAparelhos(lista);
};

window.abrirDetalhes = function(id) {
  const ativo = aparelhosCache.find(a => a.id === id);
  if (!ativo) return;
  const container = document.getElementById('conteudoDetalhes');
  let html = `
    <div class="detalhe-item"><span class="detalhe-label">CÓDIGO ID</span><span class="detalhe-valor">#${String(ativo.id).padStart(3,'0')}</span></div>
    <div class="detalhe-item"><span class="detalhe-label">CATEGORIA</span><span class="detalhe-valor">${ativo.categoria}</span></div>
    <div class="detalhe-item"><span class="detalhe-label">MARCA</span><span class="detalhe-valor">${ativo.marca}</span></div>
    <div class="detalhe-item"><span class="detalhe-label">STATUS</span><span class="detalhe-valor">${badgeStatus(ativo.status)}</span></div>
    <div class="detalhe-item" style="grid-column: span 2"><span class="detalhe-label">MODELO</span><span class="detalhe-valor">${ativo.modelo}</span></div>
    <div class="detalhe-item" style="grid-column: span 2"><span class="detalhe-label">N° DE SÉRIE</span><span class="detalhe-valor">${ativo.numero_serie}</span></div>
  `;
  if (ativo.imei && ativo.categoria === 'Celular') html += `<div class="detalhe-item" style="grid-column: span 2"><span class="detalhe-label">IMEI</span><span class="detalhe-valor">${ativo.imei}</span></div>`;
  if (ativo.hostname) html += `<div class="detalhe-item"><span class="detalhe-label">HOSTNAME</span><span class="detalhe-valor">${ativo.hostname}</span></div>`;
  if (ativo.tipo_periferico) html += `<div class="detalhe-item" style="grid-column: span 2"><span class="detalhe-label">TIPO</span><span class="detalhe-valor">${ativo.tipo_periferico}</span></div>`;
  
  container.innerHTML = html;
  openModal('modalDetalhes');
};

async function cadastrarAparelho() {
  const id = document.getElementById('fIdAparelho').value;
  const cat = document.getElementById('fCat').value;
  const payload = {
    categoria: cat,
    marca: document.getElementById('fMarca').value.trim(),
    modelo: document.getElementById('fModelo').value.trim(),
    numero_serie: document.getElementById('fSerie').value.trim(),
    imei: document.getElementById('fImei').value.trim(),
    hostname: document.getElementById('fHostname').value.trim(),
    tipo_periferico: document.getElementById('fTipoPeri').value.trim()
  };

  if (!payload.marca || !payload.modelo || !payload.numero_serie) {
    setMsg('msgCadastrar', 'PREENCHA OS CAMPOS OBRIGATÓRIOS!', 'err'); return;
  }
  if (cat === 'Celular' && !payload.imei) {
    setMsg('msgCadastrar', 'IMEI OBRIGATÓRIO PARA CELULARES!', 'err'); return;
  }

  const url = id ? `/aparelhos/${id}` : '/aparelhos';
  const metodo = id ? 'PUT' : 'POST';

  const { ok, data } = await apiFetch(url, { method: metodo, body: JSON.stringify(payload) });
  if (ok) {
    setMsg('msgCadastrar', id ? 'ATUALIZADO COM SUCESSO!' : 'CADASTRADO COM SUCESSO!', 'ok');
    setTimeout(() => { closeModal('modalCadastrar'); recarregarTudo(); }, 1200);
  } else {
    setMsg('msgCadastrar', data.erro, 'err');
  }
}

window.editarAparelho = function(id) {
  const ativo = aparelhosCache.find(a => a.id === id);
  if (!ativo) return;
  
  document.getElementById('tituloModalAparelho').textContent = 'EDITAR DISPOSITIVO';
  document.getElementById('fIdAparelho').value = ativo.id;
  
  document.getElementById('fCat').value = ativo.categoria;
  document.getElementById('fMarca').value = ativo.marca;
  document.getElementById('fModelo').value = ativo.modelo;
  document.getElementById('fSerie').value = ativo.numero_serie;
  document.getElementById('fImei').value = ativo.imei || '';
  document.getElementById('fHostname').value = ativo.hostname || '';
  document.getElementById('fTipoPeri').value = ativo.tipo_periferico || '';
  
  window.mudarFormularioCadastro();
  openModal('modalCadastrar');
};

window.excluirAparelho = async function(id) {
  if (!confirm('Tem certeza que deseja apagar este ativo permanentemente?')) return;
  const { ok, data } = await apiFetch(`/aparelhos/${id}`, { method: 'DELETE' });
  if (ok) { 
    alert('Ativo apagado com sucesso!'); 
    recarregarTudo(); 
  } else { 
    alert('ERRO: ' + data.erro); 
  }
};

// ==========================================
// GESTÃO DE COLABORADORES (CRUD)
// ==========================================
async function carregarColaboradores() {
  const tbody = document.getElementById('tbodyColab');
  const selSaida = document.getElementById('fSaidaColab');
  const { ok, data } = await apiFetch('/colaboradores');
  
  if (ok) {
    colabCache = data;
    if (tbody) {
      tbody.innerHTML = data.map(c => `
        <tr>
          <td>#${String(c.id).padStart(3,'0')}</td>
          <td>${c.nome}</td>
          <td>${c.username || '-'}</td>
          <td>
            <button class="btn-link" style="color: var(--amber);" onclick="editarColaborador(${c.id})">EDITAR</button> |
            <button class="btn-link" style="color: var(--red);" onclick="excluirColaborador(${c.id})">EXCLUIR</button>
          </td>
        </tr>
      `).join('');
    }
    if (selSaida) {
      selSaida.innerHTML = '<option value="">-- selecionar --</option>' + data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    }
  }
}

async function cadastrarColaborador() {
  const id = document.getElementById('fIdColab').value;
  const nome = document.getElementById('fColabNome').value.trim();
  const username = document.getElementById('fColabUser').value.trim();
  if (!nome) { setMsg('msgColab', 'NOME É OBRIGATÓRIO!', 'err'); return; }

  const url = id ? `/colaboradores/${id}` : '/colaboradores';
  const metodo = id ? 'PUT' : 'POST';

  const { ok, data } = await apiFetch(url, { method: metodo, body: JSON.stringify({ nome, username }) });
  if (ok) {
    setMsg('msgColab', id ? 'ATUALIZADO!' : 'CADASTRADO!', 'ok');
    setTimeout(() => { closeModal('modalColab'); carregarColaboradores(); }, 1200);
  } else {
    setMsg('msgColab', data.erro, 'err');
  }
}

window.editarColaborador = function(id) {
  const c = colabCache.find(x => x.id === id);
  if (!c) return;
  
  document.getElementById('tituloModalColab').textContent = 'EDITAR COLABORADOR';
  document.getElementById('fIdColab').value = c.id;
  document.getElementById('fColabNome').value = c.nome;
  document.getElementById('fColabUser').value = c.username || '';
  
  openModal('modalColab');
};

window.excluirColaborador = async function(id) {
  if (!confirm('Tem certeza que deseja apagar este colaborador?')) return;
  const { ok, data } = await apiFetch(`/colaboradores/${id}`, { method: 'DELETE' });
  if (ok) { 
    alert('Colaborador apagado com sucesso!'); 
    recarregarTudo(); 
  } else { 
    alert('ERRO: ' + data.erro); 
  }
};

// ==========================================
// MOVIMENTAÇÕES E TERMOS
// ==========================================
async function carregarMovimentacoes() {
  const tbodyMov = document.getElementById('tbodyMov');
  const tbodyResumo = document.getElementById('tbodyMovResumo');
  
  const { ok, data } = await apiFetch('/movimentacoes');
  if (!ok) return;

  if (data.length === 0) {
    if (tbodyMov) tbodyMov.innerHTML = '<tr><td colspan="5" class="loading-row">NENHUMA MOVIMENTAÇÃO REGISTRADA</td></tr>';
    if (tbodyResumo) tbodyResumo.innerHTML = '<tr><td colspan="4" class="loading-row">NENHUMA MOVIMENTAÇÃO</td></tr>';
    return;
  }

  if (tbodyMov) {
    tbodyMov.innerHTML = data.map(m => `
      <tr>
        <td>#${String(m.id).padStart(3,'0')}</td>
        <td>${m.aparelho || '-'}</td>
        <td style="color: var(--cyan);">${m.colaborador || '-'}</td>
        <td>${new Date(m.data_movimentacao).toLocaleString('pt-BR')}</td>
        <td>${badgeTipo(m.tipo_movimentacao)}</td>
      </tr>
    `).join('');
  }

  if (tbodyResumo) {
    tbodyResumo.innerHTML = data.slice(0, 5).map(m => `
      <tr>
        <td>#${String(m.id).padStart(3,'0')}</td>
        <td>${m.aparelho || '-'}</td>
        <td>${new Date(m.data_movimentacao).toLocaleDateString('pt-BR')}</td>
        <td>${badgeTipo(m.tipo_movimentacao)}</td>
      </tr>
    `).join('');
  }
}

async function registrarSaida() {
  const body = {
    aparelho_id: parseInt(document.getElementById('fSaidaAparelho').value),
    colaborador_id: parseInt(document.getElementById('fSaidaColab').value),
    matricula: document.getElementById('fTermoMatricula').value.trim(),
    contato: document.getElementById('fTermoContato').value.trim(),
    observacao_estado: document.getElementById('fSaidaEstado').value.trim(),
    obs: document.getElementById('fSaidaEstado').value.trim(), // Garante a compatibilidade com o Word
    acessorios: document.getElementById('fSaidaAcessorios').value.trim()
  };
  
  if (!body.aparelho_id || !body.colaborador_id || !body.matricula) {
    setMsg('msgSaida', 'PREENCHA ATIVO, COLABORADOR E MATRÍCULA!', 'err'); return;
  }
  
  const { ok, data } = await apiFetch('/movimentacoes/saida', { method: 'POST', body: JSON.stringify(body) });
  if (ok) {
    setMsg('msgSaida', 'REGISTRADO! BAIXANDO TERMO...', 'ok');
    await baixarArquivo('/gerar_termo', body);
    setTimeout(() => { closeModal('modalSaida'); recarregarTudo(); }, 1500);
  } else { 
    setMsg('msgSaida', data.erro, 'err'); 
  }
}

async function registrarDevolucao() {
  const body = {
    aparelho_id: parseInt(document.getElementById('fDevAparelho').value),
    nome_colab: document.getElementById('fDevNome').value.trim(),
    contato: document.getElementById('fDevContato').value.trim(),
    observacao_estado: document.getElementById('fDevEstado').value.trim(),
    obs: document.getElementById('fDevEstado').value.trim(), // Garante a compatibilidade com o Word
    acessorios: document.getElementById('fDevAcessorios').value.trim()
  };

  if (!body.aparelho_id || !body.nome_colab) {
    setMsg('msgDev', 'INFORME O ID DO ATIVO E O NOME!', 'err'); return;
  }

  const { ok, data } = await apiFetch('/movimentacoes/devolucao', { method: 'POST', body: JSON.stringify(body) });
  if (ok) {
    setMsg('msgDev', 'DEVOLUÇÃO REGISTRADA! BAIXANDO TERMO...', 'ok');
    await baixarArquivo('/gerar_termo_devolucao', body);
    setTimeout(() => { closeModal('modalDevolucao'); recarregarTudo(); }, 1500);
  } else { 
    setMsg('msgDev', data.erro, 'err'); 
  }
}

async function baixarArquivo(rota, body) {
  try {
    const res = await fetch(API_URL + rota, { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(body) 
    });
    
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      const prefixo = rota.includes('devolucao') ? 'Devolucao' : 'Saida';
      a.download = `${prefixo}_${Date.now()}.docx`;
      document.body.appendChild(a); 
      a.click(); 
      a.remove();
    } else {
      const data = await res.json();
      alert(`⚠️ Erro ao gerar o termo: ${data.erro}`);
    }
  } catch (error) {
    alert("⚠️ Erro crítico de comunicação ao tentar baixar o documento.");
  }
}

// ==========================================
// INICIALIZAÇÃO E EVENTOS
// ==========================================
function iniciarRelogio() {
  const tick = () => {
    const n = new Date(), p = v => String(v).padStart(2, '0');
    document.getElementById('clk').textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
    document.getElementById('fdate').textContent = n.toLocaleDateString('pt-BR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
  };
  tick(); setInterval(tick, 1000);
}

async function recarregarTudo() {
  try {
    await carregarCards();
    await carregarAparelhos();
    await carregarColaboradores();
    await carregarMovimentacoes();
    atualizarStatusConexao(true);
  } catch (e) {
    atualizarStatusConexao(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  recarregarTudo();

  // Navegação de Abas
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('tab-' + item.dataset.tab).classList.add('active');
    });
  });

  // Botões de Abrir Modal (Garantindo que limpam IDs antigos)
  document.getElementById('btnCadastrar').onclick = () => { 
    document.getElementById('fIdAparelho').value = '';
    document.getElementById('tituloModalAparelho').textContent = 'CADASTRAR DISPOSITIVO';
    document.querySelectorAll('#modalCadastrar input').forEach(i => i.value = '');
    window.mudarFormularioCadastro();
    openModal('modalCadastrar'); 
  };
  
  document.getElementById('btnNovoAparelho').onclick = () => { 
    document.getElementById('fIdAparelho').value = '';
    document.getElementById('tituloModalAparelho').textContent = 'CADASTRAR DISPOSITIVO';
    document.querySelectorAll('#modalCadastrar input').forEach(i => i.value = '');
    window.mudarFormularioCadastro();
    openModal('modalCadastrar'); 
  };

  document.getElementById('btnNovoColab').onclick = () => { 
    document.getElementById('fIdColab').value = '';
    document.getElementById('tituloModalColab').textContent = 'NOVO COLABORADOR';
    document.querySelectorAll('#modalColab input').forEach(i => i.value = '');
    openModal('modalColab'); 
  };

  document.getElementById('btnSaida').onclick = () => { 
    document.querySelectorAll('#modalSaida input, #modalSaida textarea').forEach(i => i.value = '');
    // Atualiza a lista de aparelhos caso algum status tenha mudado
    carregarAparelhos();
    openModal('modalSaida'); 
  };
  
  document.getElementById('btnDevolucao').onclick = () => {
    document.querySelectorAll('#modalDevolucao input, #modalDevolucao textarea').forEach(i => i.value = '');
    // Atualiza a lista de aparelhos caso algum status tenha mudado
    carregarAparelhos();
    openModal('modalDevolucao');
  };

  // Botões de Confirmar Ação
  document.getElementById('btnConfCadastrar').onclick = cadastrarAparelho;
  document.getElementById('btnConfColab').onclick = cadastrarColaborador;
  document.getElementById('btnConfSaida').onclick = registrarSaida;
  document.getElementById('btnConfDev').onclick = registrarDevolucao;

  // Fechar Modais
  document.querySelectorAll('.modal-close, .btn-ghost').forEach(b => b.onclick = () => closeModal(b.closest('.modal-overlay').id));

  // Autocomplete do Nome do Responsável na Devolução
  document.getElementById('fDevAparelho').addEventListener('change', async function() {
    if (!this.value) {
      document.getElementById('fDevNome').value = '';
      return;
    }
    const { ok, data } = await apiFetch(`/aparelhos/${this.value}/responsavel`);
    if (ok && data.nome) document.getElementById('fDevNome').value = data.nome;
  });

});