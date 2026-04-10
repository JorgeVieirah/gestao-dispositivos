const API_URL = window.location.origin; // Usa automaticamente o mesmo host/porta do Flask

// ─── UTILITÁRIOS ───────────────────────────────────────────────────

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
  if (tipo.toLowerCase().includes('devolução')) return '<span class="badge badge-dev">DEVOLUÇÃO</span>';
  return '<span class="badge badge-out">SAÍDA</span>';
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

// ─── RELÓGIO ───────────────────────────────────────────────────────

function iniciarRelogio() {
  const tick = () => {
    const n = new Date(), p = v => String(v).padStart(2, '0');
    document.getElementById('clk').textContent = p(n.getHours()) + ':' + p(n.getMinutes()) + ':' + p(n.getSeconds());
    document.getElementById('fdate').textContent = n.toLocaleDateString('pt-BR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
  };
  tick(); setInterval(tick, 1000);
}

// ─── STATUS DA API ─────────────────────────────────────────────────

async function verificarApi() {
  // 👉 CORREÇÃO: Agora o JS bate na rota certa para ver se está online
  const { ok } = await apiFetch('/status');
  const dot = document.querySelector('.live-dot');
  const txt = document.getElementById('statusTxt');
  if (ok) {
    dot.classList.remove('offline'); txt.classList.remove('offline');
    txt.textContent = 'API ONLINE';
  } else {
    dot.classList.add('offline'); txt.classList.add('offline');
    txt.textContent = 'API OFFLINE';
  }
}

// ─── CARDS DO DASHBOARD ────────────────────────────────────────────

async function carregarCards() {
  const { ok, data } = await apiFetch('/aparelhos');
  if (!ok) return;

  const total = data.length;
  const disponiveis = data.filter(a => a.status === 'Disponível').length;
  const emUso = data.filter(a => a.status === 'Em Uso').length;
  const manutencao = data.filter(a => a.status === 'Manutenção').length;
  const pct = total > 0 ? Math.round((disponiveis / total) * 100) : 0;

  document.getElementById('totalAparelhos').textContent = total;
  document.getElementById('totalDisponiveis').textContent = disponiveis;
  document.getElementById('totalEmUso').textContent = emUso;
  document.getElementById('totalManutencao').textContent = manutencao;
  document.getElementById('dispDetalhe').textContent = pct + '% do total';
  document.getElementById('totalDetalhe').textContent = total + ' dispositivos';

  atualizarGraficoDonut(disponiveis, emUso, manutencao);
}

// ─── GRÁFICOS ──────────────────────────────────────────────────────

let donutChart = null;
let lineChart = null;

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
        borderWidth: 3,
        hoverOffset: 5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + c.raw } },
      },
    },
  });

  const legend = document.getElementById('donutLegend');
  const total = disp + uso + mnt;
  legend.innerHTML = [
    { label: 'DISPONÍVEL', val: disp, cor: '#39d353' },
    { label: 'EM USO', val: uso, cor: '#f0a500' },
    { label: 'MANUTENÇÃO', val: mnt, cor: '#ff4444' },
  ].map(l => {
    const pct = total > 0 ? Math.round((l.val / total) * 100) : 0;
    return `<span class="leg-item"><span class="leg-sq" style="background:${l.cor}"></span>${l.label} ${pct}%</span>`;
  }).join('');
}

function iniciarGraficoLinhas() {
  const ctx = document.getElementById('lChart');
  if (!ctx) return;

  // Dados de exemplo — substitua por endpoint real quando disponível
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
      datasets: [
        {
          label: 'Saídas', data: [3, 5, 2, 6, 4, 1, 0],
          borderColor: '#39d353', backgroundColor: 'rgba(57,211,83,.07)',
          tension: .4, pointBackgroundColor: '#39d353', pointRadius: 3, borderWidth: 1.5, fill: true,
        },
        {
          label: 'Devoluções', data: [2, 3, 4, 3, 5, 2, 0],
          borderColor: '#00e5ff', backgroundColor: 'rgba(0,229,255,.05)',
          tension: .4, pointBackgroundColor: '#00e5ff', pointRadius: 3, borderWidth: 1.5, fill: true,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#444', font: { family: 'Share Tech Mono', size: 9 }, autoSkip: false }, grid: { color: '#161616' } },
        y: { ticks: { color: '#444', font: { family: 'Share Tech Mono', size: 9 }, stepSize: 2 }, grid: { color: '#161616' }, beginAtZero: true },
      },
    },
  });
}

// ─── TABELA DE APARELHOS ───────────────────────────────────────────

let aparelhosCache = [];
let filtroAtual = 'todos';

async function carregarAparelhos() {
  const tbody = document.getElementById('tbodyAparelhos');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">CARREGANDO...</td></tr>';

  const { ok, data } = await apiFetch('/aparelhos');
  if (!ok) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row" style="color:var(--red)">ERRO AO CARREGAR</td></tr>';
    return;
  }

  aparelhosCache = data;
  renderizarAparelhos(data);
}

function renderizarAparelhos(lista) {
  const tbody = document.getElementById('tbodyAparelhos');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">NENHUM APARELHO ENCONTRADO</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>#${String(a.id).padStart(3,'0')}</td>
      <td>${a.modelo}</td>
      <td>${a.imei}</td>
      <td>${a.numero_serie}</td>
      <td>${badgeStatus(a.status)}</td>
      <td>
        <button class="btn-link" onclick="verAparelho(${a.id})">VER</button>
      </td>
    </tr>
  `).join('');
}

function filtAparelhos(status, btn) {
  filtroAtual = status;
  document.querySelectorAll('.search-row .fbtn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const termo = document.getElementById('srchAparelhos').value.toLowerCase();
  let lista = aparelhosCache;
  if (status !== 'todos') lista = lista.filter(a => a.status === status);
  if (termo) lista = lista.filter(a => JSON.stringify(a).toLowerCase().includes(termo));
  renderizarAparelhos(lista);
}

function verAparelho(id) {
  const a = aparelhosCache.find(x => x.id === id);
  if (!a) return;
  alert(`ID: ${a.id}\nModelo: ${a.modelo}\nIMEI: ${a.imei}\nN° Série: ${a.numero_serie}\nStatus: ${a.status}`);
}

// ─── TABELA DE MOVIMENTAÇÕES ───────────────────────────────────────

async function carregarMovimentacoes() {
  const tbody = document.getElementById('tbodyMov');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">CARREGANDO...</td></tr>';

  const { ok, data } = await apiFetch('/movimentacoes');
  if (!ok) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row" style="color:var(--red)">ERRO AO CARREGAR</td></tr>';
    return;
  }

  const badge = document.getElementById('movBadge');
  if (badge) badge.textContent = data.length + ' REGISTROS';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">NENHUMA MOVIMENTAÇÃO REGISTRADA</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>#${String(m.id).padStart(3,'0')}</td>
      <td>${m.aparelho || '-'}</td>
      <td>${m.colaborador || '-'}</td>
      <td>${badgeTipo(m.tipo_movimentacao)}</td>
      <td>${m.data_movimentacao || '-'}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${m.observacao_estado || '-'}</td>
    </tr>
  `).join('');
}

// ─── TABELA DE COLABORADORES ───────────────────────────────────────

let colaboradoresCache = [];

async function carregarColaboradores() {
  const tbody = document.getElementById('tbodyColab');
  tbody.innerHTML = '<tr><td colspan="2" class="loading-row">CARREGANDO...</td></tr>';

  const { ok, data } = await apiFetch('/colaboradores');
  if (!ok) {
    tbody.innerHTML = '<tr><td colspan="2" class="loading-row" style="color:var(--red)">ERRO AO CARREGAR</td></tr>';
    return;
  }

  colaboradoresCache = data;

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="2" class="loading-row">NENHUM COLABORADOR CADASTRADO</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr><td>#${String(c.id).padStart(3,'0')}</td><td>${c.nome}</td></tr>
  `).join('');

  // Atualiza o select do modal de saída
  const sel = document.getElementById('fSaidaColab');
  if (sel) {
    sel.innerHTML = '<option value="">-- selecione --</option>' +
      data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
}

// ─── AÇÕES DE FORMULÁRIO ───────────────────────────────────────────

async function cadastrarAparelho() {
  const modelo = document.getElementById('fModelo').value.trim();
  const imei = document.getElementById('fImei').value.trim();
  const numero_serie = document.getElementById('fSerie').value.trim();

  if (!modelo || !imei || !numero_serie) {
    setMsg('msgCadastrar', 'PREENCHA TODOS OS CAMPOS', 'err'); return;
  }

  const { ok, data } = await apiFetch('/aparelhos', {
    method: 'POST',
    body: JSON.stringify({ modelo, imei, numero_serie }),
  });

  if (ok) {
    setMsg('msgCadastrar', 'APARELHO CADASTRADO COM SUCESSO!', 'ok');
    document.getElementById('fModelo').value = '';
    document.getElementById('fImei').value = '';
    document.getElementById('fSerie').value = '';
    setTimeout(() => { closeModal('modalCadastrar'); recarregarTudo(); }, 1200);
  } else {
    setMsg('msgCadastrar', data.erro || 'ERRO AO CADASTRAR', 'err');
  }
}

async function registrarSaida() {
  const aparelho_id = document.getElementById('fSaidaAparelho').value;
  const colaborador_id = document.getElementById('fSaidaColab').value;
  const tipo_movimentacao = document.getElementById('fSaidaTipo').value.trim() || 'Saída';
  const itens_inclusos = document.getElementById('fSaidaItens').value.trim();
  const observacao_estado = document.getElementById('fSaidaObs').value.trim();

  if (!aparelho_id || !colaborador_id) {
    setMsg('msgSaida', 'INFORME O APARELHO E O COLABORADOR', 'err'); return;
  }

  const { ok, data } = await apiFetch('/movimentacoes/saida', {
    method: 'POST',
    body: JSON.stringify({ aparelho_id: parseInt(aparelho_id), colaborador_id: parseInt(colaborador_id), tipo_movimentacao, itens_inclusos, observacao_estado }),
  });

  if (ok) {
    setMsg('msgSaida', 'SAÍDA REGISTRADA COM SUCESSO!', 'ok');
    setTimeout(() => { closeModal('modalSaida'); recarregarTudo(); }, 1200);
  } else {
    setMsg('msgSaida', data.erro || 'ERRO AO REGISTRAR', 'err');
  }
}

async function registrarDevolucao() {
  const aparelho_id = document.getElementById('fDevAparelho').value;
  const itens_inclusos = document.getElementById('fDevItens').value.trim();
  const observacao_estado = document.getElementById('fDevObs').value.trim();

  if (!aparelho_id) {
    setMsg('msgDev', 'INFORME O ID DO APARELHO', 'err'); return;
  }

  const { ok, data } = await apiFetch('/movimentacoes/devolucao', {
    method: 'POST',
    body: JSON.stringify({ aparelho_id: parseInt(aparelho_id), itens_inclusos, observacao_estado }),
  });

  if (ok) {
    setMsg('msgDev', 'DEVOLUÇÃO REGISTRADA COM SUCESSO!', 'ok');
    setTimeout(() => { closeModal('modalDevolucao'); recarregarTudo(); }, 1200);
  } else {
    setMsg('msgDev', data.erro || 'ERRO AO REGISTRAR', 'err');
  }
}

async function cadastrarColaborador() {
  const nome = document.getElementById('fColabNome').value.trim();
  if (!nome) { setMsg('msgColab', 'INFORME O NOME', 'err'); return; }

  const { ok, data } = await apiFetch('/colaboradores', {
    method: 'POST',
    body: JSON.stringify({ nome }),
  });

  if (ok) {
    setMsg('msgColab', 'COLABORADOR CADASTRADO!', 'ok');
    document.getElementById('fColabNome').value = '';
    setTimeout(() => { closeModal('modalColab'); carregarColaboradores(); }, 1200);
  } else {
    setMsg('msgColab', data.erro || 'ERRO AO CADASTRAR', 'err');
  }
}

// ─── RECARREGAR TUDO ───────────────────────────────────────────────

async function recarregarTudo() {
  await Promise.all([carregarCards(), carregarAparelhos(), carregarMovimentacoes(), carregarColaboradores()]);
}

// ─── EFEITO 3D NOS CARDS ───────────────────────────────────────────

function apply3D(el, shine, e) {
  const r = el.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const rx = -(dy / r.height) * 16;
  const ry = (dx / r.width) * 16;
  const sx = ((e.clientX - r.left) / r.width) * 100;
  const sy = ((e.clientY - r.top) / r.height) * 100;
  el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03,1.03,1.03)`;
  el.style.boxShadow = '0 8px 30px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04)';
  if (shine) shine.style.background = `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,.07) 0%, transparent 65%)`;
}

function reset3D(el, shine) {
  el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  el.style.boxShadow = 'none';
  if (shine) shine.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.04) 0%, transparent 70%)';
}

function iniciar3D() {
  document.querySelectorAll('.card-3d, .act-card').forEach(card => {
    const shine = card.querySelector('.card-shine, .act-shine');
    card.addEventListener('mousemove', e => apply3D(card, shine, e));
    card.addEventListener('mouseleave', () => reset3D(card, shine));
  });
}

// ─── NAVEGAÇÃO POR ABAS ────────────────────────────────────────────

function iniciarNavegacao() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');

      if (tab === 'aparelhos') carregarAparelhos();
      if (tab === 'movimentacoes') carregarMovimentacoes();
      if (tab === 'colaboradores') carregarColaboradores();
    });
  });
}

// ─── EVENTOS DOS BOTÕES ────────────────────────────────────────────

function iniciarEventos() {
  // Abrir modais
  ['btnCadastrar', 'btnNovoAparelho'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('modalCadastrar'));
  });
  ['btnSaida', 'btnSaida2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { carregarColaboradores(); openModal('modalSaida'); });
  });
  ['btnDevolucao', 'btnDevolucao2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('modalDevolucao'));
  });
  document.getElementById('btnNovoColab')?.addEventListener('click', () => openModal('modalColab'));

  // Confirmar ações
  document.getElementById('btnConfCadastrar')?.addEventListener('click', cadastrarAparelho);
  document.getElementById('btnConfSaida')?.addEventListener('click', registrarSaida);
  document.getElementById('btnConfDev')?.addEventListener('click', registrarDevolucao);
  document.getElementById('btnConfColab')?.addEventListener('click', cadastrarColaborador);

  // Fechar modais pelo botão X e CANCELAR
  document.querySelectorAll('.modal-close, .btn-ghost[data-modal]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.modal));
  });

  // Fechar modal clicando no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
  });

  // Busca em tempo real na tabela de aparelhos
  document.getElementById('srchAparelhos')?.addEventListener('input', function () {
    const termo = this.value.toLowerCase();
    let lista = filtroAtual === 'todos' ? aparelhosCache : aparelhosCache.filter(a => a.status === filtroAtual);
    if (termo) lista = lista.filter(a => JSON.stringify(a).toLowerCase().includes(termo));
    renderizarAparelhos(lista);
  });
}

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  iniciarRelogio();
  iniciarNavegacao();
  iniciarEventos();
  iniciar3D();
  iniciarGraficoLinhas();

  await verificarApi();
  await recarregarTudo();

  // Atualiza os dados a cada 30 segundos automaticamente
  setInterval(async () => {
    await verificarApi();
    await carregarCards();
  }, 30000);
});