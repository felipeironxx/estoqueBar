// routes/relatorio.js
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth'); // <-- importante
const router = express.Router();

/**
 * GET /api/relatorio?tipo=entrada|saida&inicio=YYYY-MM-DD&fim=YYYY-MM-DD
 * Retorna registros e total (soma de valor_total) no intervalo (inclusive fim).
 */
router.get('/', auth, async (req, res) => {
  try {
    const { tipo, inicio, fim } = req.query;
    if (!tipo || !inicio || !fim) {
      return res.status(400).json({ message: 'Parâmetros obrigatórios: tipo, inicio, fim' });
    }

    if (tipo !== 'entrada' && tipo !== 'saida') {
      return res.status(400).json({ message: 'Tipo inválido. Use "entrada" ou "saida".' });
    }

    // garante incluir o fim até 23:59:59 (caso sua coluna data seja TIMESTAMP/DATETIME)
    const inicioTS = inicio + ' 00:00:00';
    const fimTS = fim + ' 23:59:59';

    // seleciona tabela e monta query com join para pegar descrição do produto
    const tabela = tipo === 'entrada' ? 'entradas' : 'saidas';

    const sql = `
      SELECT r.id, r.numero_nota, r.data, p.descricao, r.quantidade, r.valor_unitario, r.valor_total
      FROM ${tabela} r
      LEFT JOIN produtos p ON r.id_produto = p.id
      WHERE r.data BETWEEN ? AND ?
      ORDER BY r.data ASC
    `;

    const [rows] = await pool.query(sql, [inicioTS, fimTS]);

    const total = rows.reduce((acc, cur) => acc + parseFloat(cur.valor_total || 0), 0);

    res.json({
      tipo,
      inicio,
      fim,
      total: Number(total.toFixed(2)),
      registros: rows
    });
  } catch (err) {
    console.error('Erro relatorio:', err);
    res.status(500).json({ message: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
