const API_BASE = 'http://192.168.0.8:3000/api';

function getToken() {
  return localStorage.getItem('token');
}
function setToken(t) {
  if (t) localStorage.setItem('token', t);
}

async function apiFetch(path, method = 'GET', body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  // Tratamento do cabeçalho de atualização do token
  const refresh = res.headers.get('x-refresh-token');
  if (refresh) setToken(refresh);
  if (res.status === 401) {
    // Token expirado ou inválido -> redirecionar para login
    alert('Sessão expirada. Faça login novamente.');
    logout();
    return null;
  }
  const txt = await res.json().catch(() => null);
  if (!res.ok) {
    alert((txt && txt.message) || 'Erro na requisição');
    return null;
  }
  return txt;
}

async function initAuth() {
  // Proteger páginas: se não houver token => redirecionar (exceto login.html)
  if (location.pathname.endsWith('/login.html') || location.pathname === '/login.html') return;
  const token = getToken();
  if (!token) { location.href = '/login.html'; return; }
  // Tentativa de chamada leve ao painel de controle para validar e atualizar o token.
  const r = await apiFetch('/dashboard/entradas', 'GET');
  if (r === null) return; // já tratado em apiFetch
  // Exibir link de configuração se for administrador.
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.id_grupo === 1) {
    document.querySelectorAll('[id^="cfgLink"]').forEach(el => el.style.display = 'block');
  }
  // Botão de Logout
  document.querySelectorAll('#logout').forEach(b => b.addEventListener('click', logout));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = '/login.html';
}

// Carregador do dashboard
async function loadDashboard() {
  const e = await apiFetch('/dashboard/entradas', 'GET');
  const s = await apiFetch('/dashboard/saidas', 'GET');
  const sal = await apiFetch('/dashboard/saldo', 'GET');
  if (e) document.getElementById('entradasVal').innerText = 'R$ ' + Number(e.total).toFixed(2);
  if (s) document.getElementById('saidasVal').innerText = 'R$ ' + Number(s.total).toFixed(2);
  if (sal) document.getElementById('saldoVal').innerText = 'R$ ' + Number(sal.saldo).toFixed(2);

  // Carregador das ultimas entradas e saidas
  const entradas = await apiFetch('/entradas?month=' + new Date().toISOString().slice(0, 7), 'GET');
  const saidas = await apiFetch('/saidas?month=' + new Date().toISOString().slice(0, 7), 'GET');
  //document.getElementById('ultimasEntradas').innerHTML = (entradas||[]).slice(0,5).map(i=>`<div>${i.data} - ${i.descricao} - ${i.valor_total}</div>`).join('');
  //document.getElementById('ultimasSaidas').innerHTML = (saidas||[]).slice(0,5).map(i=>`<div>${i.data} - ${i.descricao} - ${i.valor_total}</div>`).join('');

  function formatarData(dataISO) {
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  document.getElementById('ultimasEntradas').innerHTML = (entradas || [])
    .slice(0, 5)
    .map(i => `
    <div class="item-linha entrada">
      <div><strong>${formatarData(i.data)}</strong></div>
      <div>${i.descricao}</div>
      <div>Qtd: ${i.quantidade || 0}</div>
      <div>Nota: ${i.numero_nota || '-'}</div>
      <div><strong>R$ ${Number(i.valor_total).toFixed(2)}</strong></div>
    </div>
  `).join('');

  document.getElementById('ultimasSaidas').innerHTML = (saidas || [])
    .slice(0, 5)
    .map(i => `
    <div class="item-linha saida">
      <div><strong>${formatarData(i.data)}</strong></div>
      <div>${i.descricao}</div>
      <div>Qtd: ${i.quantidade || 0}</div>
      <div>Nota: ${i.numero_nota || '-'}</div>
      <div><strong>R$ ${Number(i.valor_total).toFixed(2)}</strong></div>
    </div>
  `).join('');

}

// =============================
// === PRODUTOS (Tela) ========
// =============================
if (window.location.pathname.endsWith('/produtos.html')) {
  (async () => {
    await initAuth();
    await loadProdutos();
  })();

  let mostrandoAtivos = true;
  let editandoId = null;

  document.getElementById('btnAdd').addEventListener('click', async () => {
    const descricao = document.getElementById('descricao').value;
    const valor = document.getElementById('valor').value;
    const quantidade = document.getElementById('quantidade').value;
    const res = await apiFetch('/produtos', 'POST', { descricao, valor, quantidade });
    if (res) await loadProdutos();
  });

  // Alternar entre produtos ativos e inativos
  document.getElementById('btnToggleAtivos').addEventListener('click', async () => {
    mostrandoAtivos = !mostrandoAtivos;
    document.getElementById('btnToggleAtivos').textContent = mostrandoAtivos ? 'Ver Inativos' : 'Ver Ativos';
    await loadProdutos();
  });

   async function loadProdutos() {
    const rows = await apiFetch('/produtos', 'GET'); // backend retorna todos
    const tbody = document.querySelector('#tblProdutos tbody');
    tbody.innerHTML = '';

    // Filtra pelo campo "ativo"
    const filtrados = rows.filter(r => mostrandoAtivos ? Number(r.ativo) === 1 : Number(r.ativo) === 0);

    filtrados.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.descricao}</td>
        <td>${r.valor}</td>
        <td>${r.quantidade}</td>
        <td>
          ${r.ativo
            ? `<button class="edit" data-id="${r.id}">Editar</button>
               <button class="toggle" data-id="${r.id}" data-ativo="0">Inativar</button>`
            : `<button class="toggle" data-id="${r.id}" data-ativo="1">Ativar</button>`
          }
        </td>`;
      tbody.appendChild(tr);
    });

    // Botões de ativar/inativar
    document.querySelectorAll('.toggle').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        const ativo = Number(e.target.dataset.ativo);
        await apiFetch(`/produtos/${id}/ativo`, 'PATCH', { ativo });
        await loadProdutos();
      })
    );

    // Botão de editar
    document.querySelectorAll('.edit').forEach(btn =>
      btn.addEventListener('click', e => {
        const id = e.target.dataset.id;
        const produto = filtrados.find(p => p.id == id);
        if (produto) abrirModalEdicao(produto);
      })
    );
  }

  // Modal de edição
  function abrirModalEdicao(produto) {
    const modal = document.getElementById('modalEditar');
    editandoId = produto.id;
    document.getElementById('editDescricao').value = produto.descricao;
    document.getElementById('editValor').value = produto.valor;
    document.getElementById('editQuantidade').value = produto.quantidade;
    modal.style.display = 'flex';
  }

  document.getElementById('btnCancelarEdicao').addEventListener('click', () => {
    document.getElementById('modalEditar').style.display = 'none';
  });

  document.getElementById('btnSalvarEdicao').addEventListener('click', async () => {
    const descricao = document.getElementById('editDescricao').value;
    const valor = document.getElementById('editValor').value;
    const quantidade = document.getElementById('editQuantidade').value;
    await apiFetch(`/produtos/${editandoId}`, 'PUT', { descricao, valor, quantidade });
    document.getElementById('modalEditar').style.display = 'none';
    await loadProdutos();
  });
}

// =============================
// === ENTRADAS (Tela) ========
// =============================
if (window.location.pathname.endsWith('/entradas.html')) {
  (async () => {
    await initAuth();
    await loadProdutosIntoSelect();
    await loadEntradas();
  })();

  // Adicionar entrada
  document.getElementById('btnAdd').addEventListener('click', async () => {
    const numero_nota = document.getElementById('numero_nota').value;
    const id_produto = document.getElementById('select_prod').value;
    const quantidade = document.getElementById('qtd').value;
    const valor_unitario = document.getElementById('valor').value;

    if (!id_produto || !quantidade || !valor_unitario) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    await apiFetch('/entradas', 'POST', { numero_nota, id_produto, quantidade, valor_unitario });
    await loadEntradas();

    document.getElementById('qtd').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('numero_nota').value = '';
  });

  // Carrega produtos no select
  async function loadProdutosIntoSelect() {
    const prods = await apiFetch('/produtos', 'GET');
    const sel = document.getElementById('select_prod');
    sel.innerHTML = '<option value="">Selecione um produto</option>';
    prods.forEach(p => {
      if (p.ativo) sel.innerHTML += `<option value="${p.id}">${p.descricao} (Qtd: ${p.quantidade})</option>`;
    });
  }

  // Lista entradas
  async function loadEntradas() {
    const items = await apiFetch('/entradas?month=' + new Date().toISOString().slice(0, 7), 'GET');
    const el = document.getElementById('listEntradas');

    if (!items.length) {
      el.innerHTML = '<p class="empty-msg">Nenhuma entrada registrada este mês.</p>';
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Valor Total</th>
            <th>Nº Nota</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    html += items.map(i => {
      const dataFormatada = new Date(i.data).toLocaleDateString('pt-BR', { dateStyle: 'short' });
      const valorTotal = (i.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `
        <tr>
          <td>${dataFormatada}</td>
          <td>${i.descricao}</td>
          <td>${i.quantidade}</td>
          <td>${valorTotal}</td>
          <td>${i.numero_nota || '-'}</td>
          <td>
            <button class="edit" data-id="${i.id}">Editar</button>
            <button class="del" data-id="${i.id}">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    html += `</tbody></table>`;
    el.innerHTML = html;

    // Botão de excluir
    document.querySelectorAll('.del').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        if (confirm('Deseja excluir esta entrada?')) {
          await apiFetch(`/entradas/${id}`, 'DELETE');
          await loadEntradas();
        }
      })
    );

    // Botão de editar
    document.querySelectorAll('.edit').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        const entrada = items.find(x => x.id == id);
        if (entrada) openEditEntradaModal(entrada);
      })
    );
  }

  // Função para abrir modal padrão do sistema
  function openEditEntradaModal(entrada) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('modalSave');
    const cancelBtn = document.getElementById('modalCancel');

    title.textContent = "Editar Entrada";
    body.innerHTML = `
      <label>Quantidade</label>
      <input id="editQtd" type="number" value="${entrada.quantidade}" />

      <label>Valor Unitário</label>
      <input id="editValor" type="number" step="0.01" value="${entrada.valor_unitario}" />

      <label>Número da Nota</label>
      <input id="editNota" value="${entrada.numero_nota || ''}" />
    `;

    modal.style.display = 'flex';

    cancelBtn.onclick = () => modal.style.display = 'none';
    saveBtn.onclick = async () => {
      const novaQtd = document.getElementById('editQtd').value;
      const novoValor = document.getElementById('editValor').value;
      const novaNota = document.getElementById('editNota').value;

      if (!novaQtd || !novoValor) {
        alert("Preencha todos os campos obrigatórios!");
        return;
      }

      await apiFetch(`/entradas/${entrada.id}`, 'PUT', {
        id_produto: entrada.id_produto,
        quantidade: novaQtd,
        valor_unitario: novoValor,
        numero_nota: novaNota
      });

      modal.style.display = 'none';
      await loadEntradas();
    };
  }
}

// =============================
// === SAÍDAS (Tela) ==========
// =============================
if (window.location.pathname.endsWith('/saidas.html')) {
  (async () => {
    await initAuth();
    await loadProdutosIntoSelect(); // carrega select na página
    await loadSaidas();
  })();

  // Adicionar saída (botão da página)
  document.getElementById('btnAdd').addEventListener('click', async () => {
    const numero_nota = document.getElementById('numero_nota').value;
    const id_produto = document.getElementById('select_prod').value;
    const quantidade = document.getElementById('qtd').value;
    const valor_unitario = document.getElementById('valor').value;

    if (!id_produto || !quantidade || !valor_unitario) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    await apiFetch('/saidas', 'POST', { numero_nota, id_produto, quantidade, valor_unitario });
    await loadSaidas();

    document.getElementById('qtd').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('numero_nota').value = '';
  });

  // carrega produtos para selects (página e modal)
  async function loadProdutosIntoSelect(targetId = 'select_prod') {
    const prods = await apiFetch('/produtos', 'GET');
    const sel = document.getElementById(targetId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um produto</option>';
    prods.forEach(p => {
      if (p.ativo) sel.innerHTML += `<option value="${p.id}">${p.descricao} (Qtd: ${p.quantidade})</option>`;
    });
  }

  // lista saídas do mês
  async function loadSaidas() {
    const items = await apiFetch('/saidas?month=' + new Date().toISOString().slice(0,7), 'GET');
    const el = document.getElementById('listSaidas');

    if (!items || items.length === 0) {
      el.innerHTML = '<p class="empty-msg">Nenhuma saída registrada este mês.</p>';
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Valor Total</th>
            <th>Nº Nota</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    html += items.map(i => {
      const dataFormatada = new Date(i.data).toLocaleDateString('pt-BR', { dateStyle: 'short' });
      const valorTotal = (i.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `
        <tr>
          <td>${dataFormatada}</td>
          <td>${i.descricao}</td>
          <td>${i.quantidade}</td>
          <td>${valorTotal}</td>
          <td>${i.numero_nota || '-'}</td>
          <td>
            <button class="btn-edit" data-id="${i.id}">Editar</button>
            <button class="btn-del" data-id="${i.id}">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    html += `</tbody></table>`;
    el.innerHTML = html;

    // bind delete
    document.querySelectorAll('.btn-del').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Deseja excluir esta saída?')) return;
        await apiFetch(`/saidas/${id}`, 'DELETE');
        await loadSaidas();
      })
    );

    // bind edit: abre modal
    document.querySelectorAll('.btn-edit').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const item = items.find(x => x.id == id);
        if (!item) return alert('Saída não encontrada.');

        // preencher modal
        document.getElementById('modalSaidaTitle').innerText = 'Editar Saída';
        document.getElementById('modalSaida_numero_nota').value = item.numero_nota || '';
        await loadProdutosIntoSelect('modalSaida_select_prod'); // preencher select do modal
        document.getElementById('modalSaida_select_prod').value = item.id_produto;
        document.getElementById('modalSaida_qtd').value = item.quantidade;
        document.getElementById('modalSaida_valor').value = item.valor_unitario;

        // armazenar id no atributo do modal
        const modal = document.getElementById('modalSaida');
        modal.dataset.editId = id;
        modal.style.display = 'flex'; // abre modal
      })
    );
  }

  // ---------- Modal handlers ----------
  const modal = document.getElementById('modalSaida');
  const btnSave = document.getElementById('modalSaida_save');
  const btnCancel = document.getElementById('modalSaida_cancel');

  // fechar modal
  btnCancel.addEventListener('click', () => {
    modal.style.display = 'none';
    delete modal.dataset.editId;
  });

  // salvar modal (edição)
  btnSave.addEventListener('click', async () => {
    const id = modal.dataset.editId;
    const numero_nota = document.getElementById('modalSaida_numero_nota').value;
    const id_produto = document.getElementById('modalSaida_select_prod').value;
    const quantidade = document.getElementById('modalSaida_qtd').value;
    const valor_unitario = document.getElementById('modalSaida_valor').value;

    if (!id_produto || !quantidade || !valor_unitario) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    await apiFetch(`/saidas/${id}`, 'PUT', { numero_nota, id_produto, quantidade, valor_unitario });
    modal.style.display = 'none';
    delete modal.dataset.editId;
    await loadSaidas();
  });

  // fechar modal clicando fora
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      delete modal.dataset.editId;
    }
  });
}

// =====================================
// === RELATÓRIOS (Tela) ===============
// =====================================
if (window.location.pathname.endsWith('/relatorios.html')) {
  let relatorioData = null;

  (async () => {
    await initAuth();
  })();

  function formatarData(dataISO) {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Buscar relatório
  document.getElementById('buscar').addEventListener('click', async () => {
    const tipo = document.getElementById('tipo').value;
    const inicio = document.getElementById('inicio').value;
    const fim = document.getElementById('fim').value;

    if (!inicio || !fim) {
      alert('Preencha as datas para buscar.');
      return;
    }

    const data = await apiFetch(`/relatorio?tipo=${tipo}&inicio=${inicio}&fim=${fim}`);
    if (!data) return;

    relatorioData = { ...data, tipo, inicio, fim };
    document.getElementById('exportCsv').style.display = 'inline-block';
    document.getElementById('exportPdf').style.display = 'inline-block';

    document.getElementById('tituloRelatorio').innerText =
      `Relatório de ${tipo === 'entrada' ? 'Entradas' : 'Saídas'} (${inicio} a ${fim})`;

    const tbody = document.querySelector('#tabelaRelatorio tbody');

    // render linhas
    tbody.innerHTML = data.registros.map(r => `
      <tr>
        <td>${formatarData(r.data)}</td>
        <td>${r.descricao}</td>
        <td style="text-align:center">${Number(r.quantidade || 0)}</td>
        <td style="text-align:center">${r.numero_nota || '-'}</td>
        <td style="text-align:right">R$ ${Number(r.valor_total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    // calcular totais
    const totalValor = data.registros.reduce((s, x) => s + (Number(x.valor_total) || 0), 0);
    const totalQtd = data.registros.reduce((s, x) => s + (Number(x.quantidade) || 0), 0);

    document.getElementById('totalRelatorio').innerHTML = `<strong>R$ ${totalValor.toFixed(2)}</strong>`;
    document.getElementById('totalQuantidade').innerHTML = `<strong>${totalQtd}</strong>`;
  });

  // Exportar CSV
  document.getElementById('exportCsv').addEventListener('click', () => {
    if (!relatorioData) return;

    const linhas = [
      ['Data', 'Descrição', 'Quantidade', 'Nº Nota', 'Valor (R$)'],
      ...relatorioData.registros.map(r => [
        formatarData(r.data),
        r.descricao,
        Number(r.quantidade || 0),
        (r.numero_nota || '-'),
        Number(r.valor_total || 0).toFixed(2)
      ])
    ];

    // totais
    const totalValor = relatorioData.registros.reduce((s, x) => s + (Number(x.valor_total) || 0), 0);
    const totalQtd = relatorioData.registros.reduce((s, x) => s + (Number(x.quantidade) || 0), 0);
    linhas.push(['', 'TOTAL', totalQtd, '', totalValor.toFixed(2)]);

    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${relatorioData.tipo}_${relatorioData.inicio}_${relatorioData.fim}.csv`;
    link.click();
  });

  // Exportar PDF
  document.getElementById('exportPdf').addEventListener('click', () => {
    if (!relatorioData) return;

    const totalValor = relatorioData.registros.reduce((s, x) => s + (Number(x.valor_total) || 0), 0);
    const totalQtd = relatorioData.registros.reduce((s, x) => s + (Number(x.quantidade) || 0), 0);

    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Relatório ${relatorioData.tipo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { text-align: center; margin: 0; }
            h2 { margin-top: 8px; font-weight: normal; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #333; padding: 6px; text-align: left; }
            th { background-color: #eee; }
            tfoot tr td { font-weight: bold; border-top: 2px solid #000; }
            .right { text-align: right; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h1>Relatório de ${relatorioData.tipo === 'entrada' ? 'Entradas' : 'Saídas'}</h1>
          <h2>Período: ${relatorioData.inicio} a ${relatorioData.fim}</h2>
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Quantidade</th><th>Nº Nota</th><th>Valor (R$)</th></tr>
            </thead>
            <tbody>
              ${relatorioData.registros.map(r => `
                <tr>
                  <td>${formatarData(r.data)}</td>
                  <td>${r.descricao}</td>
                  <td class="center">${Number(r.quantidade || 0)}</td>
                  <td class="center">${r.numero_nota || '-'}</td>
                  <td class="right">R$ ${Number(r.valor_total || 0).toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="text-align:right;">TOTAL QTD:</td>
                <td class="center">${totalQtd}</td>
                <td style="text-align:right;">TOTAL VALOR:</td>
                <td class="right">R$ ${totalValor.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  });
}


// ==========================
// USUÁRIOS
// ==========================
if (window.location.pathname.includes('usuarios')) {
  let usuarios = [];
  let editId = null;

  const tbody = document.getElementById('usersList');
  const modal = document.getElementById('modal');
  const nomeInput = document.getElementById('nome');
  const loginInput = document.getElementById('login');
  const senhaInput = document.getElementById('senha');
  const grupoInput = document.getElementById('grupo');

  const modalNome = document.getElementById('modal_nome');
  const modalLogin = document.getElementById('modal_login');
  const modalSenha = document.getElementById('modal_senha');
  const modalGrupo = document.getElementById('modal_grupo');

  const btnSalvarModal = document.getElementById('btnSalvarModal');
  const btnCancelarModal = document.getElementById('btnCancelarModal');
  const btnAdd = document.getElementById('btnAdd');

  // === Carrega lista de usuários ===
  async function carregarUsuarios() {
    const data = await apiFetch('/usuarios', 'GET');
    usuarios = data || [];

    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.nome}</td>
        <td>${u.login}</td>
        <td>${u.id_grupo == 1 ? 'Administrador' : 'Usuário'}</td>
        <td>
          <button class="btn-editar" data-id="${u.id}">Editar</button>
          <button class="btn-excluir" data-id="${u.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    // Liga eventos de editar e excluir
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', e => abrirModalEdicao(e.target.dataset.id));
    });
    document.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.addEventListener('click', e => excluirUsuario(e.target.dataset.id));
    });
  }

  // === Adiciona novo usuário ===
  btnAdd.addEventListener('click', async () => {
    const nome = nomeInput.value.trim();
    const login = loginInput.value.trim();
    const senha = senhaInput.value.trim();
    const id_grupo = grupoInput.value;

    if (!nome || !login || !senha) return alert('Preencha todos os campos!');

    await apiFetch('/usuarios', 'POST', { nome, login, senha, id_grupo });
    nomeInput.value = '';
    loginInput.value = '';
    senhaInput.value = '';
    grupoInput.value = '2';
    await carregarUsuarios();
  });

// === Abre modal para editar ===
function abrirModalEdicao(id) {
  const u = usuarios.find(x => x.id == id);
  if (!u) return;

  editId = id;
  modalNome.value = u.nome;
  modalLogin.value = u.login;
  modalSenha.value = '';
  modalGrupo.value = u.id_grupo;

  modal.style.display = 'flex';
}

// === Fecha modal ===
btnCancelarModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

// === Salva alterações ===
btnSalvarModal.addEventListener('click', async () => {
  if (!editId) return;

  const nome = modalNome.value.trim();
  const login = modalLogin.value.trim();
  const senha = modalSenha.value.trim();
  const id_grupo = modalGrupo.value;

  if (!nome || !login) return alert('Nome e login são obrigatórios!');

  await apiFetch(`/usuarios/${editId}`, 'PUT', { nome, login, senha, id_grupo });
  modal.style.display = 'none';
  await carregarUsuarios();
});

  // === Excluir usuário ===
  async function excluirUsuario(id) {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    await apiFetch(`/usuarios/${id}`, 'DELETE');
    await carregarUsuarios();
  }

  // === Inicia tela ===
  (async () => {
    await initAuth();
    await carregarUsuarios();
  })();
}
