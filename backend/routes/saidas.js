const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// ✅ Registrar nova saída
router.post('/', auth, async (req, res) => {
  const { numero_nota, id_produto, quantidade, valor_unitario } = req.body;
  if (!id_produto || !quantidade || !valor_unitario)
    return res.status(400).json({ message: 'Campos Ausentes.' });

  const valor_total = (parseFloat(valor_unitario) * parseInt(quantidade)).toFixed(2);

  try {
    // Verificar estoque disponível
    const [p] = await pool.query('SELECT quantidade FROM produtos WHERE id = ?', [id_produto]);
    if (!p || p.length === 0)
      return res.status(404).json({ message: 'Produto não encontrado' });
    if (p[0].quantidade < quantidade)
      return res.status(400).json({ message: 'Estoque insuficiente' });

    // Registrar saída
    await pool.query(
      'INSERT INTO saidas (numero_nota, id_produto, quantidade, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?)',
      [numero_nota || null, id_produto, quantidade, valor_unitario, valor_total]
    );

    // Atualizar estoque (diminuir quantidade)
    await pool.query('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [
      quantidade,
      id_produto,
    ]);

    res.json({ message: 'Saída registrada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de Servidor.' });
  }
});

// ✅ Listar saídas
router.get('/', auth, async (req, res) => {
  const { month } = req.query;
  let sql =
    'SELECT s.*, p.descricao FROM saidas s JOIN produtos p ON s.id_produto = p.id';
  const params = [];

  if (month) {
    sql += ' WHERE DATE_FORMAT(s.data, "%Y-%m") = ?';
    params.push(month);
  }

  sql += ' ORDER BY s.data DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de Servidor.' });
  }
});

// ✅ Editar uma saída existente
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { numero_nota, id_produto, quantidade, valor_unitario } = req.body;
  if (!id_produto || !quantidade || !valor_unitario)
    return res.status(400).json({ message: 'Campos Ausentes.' });

  try {
    // Buscar a saída original
    const [oldRows] = await pool.query('SELECT * FROM saidas WHERE id = ?', [id]);
    if (oldRows.length === 0) return res.status(404).json({ message: 'Saída não encontrada.' });
    const old = oldRows[0];

    // Repor o estoque anterior antes de recalcular
    await pool.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [
      old.quantidade,
      old.id_produto,
    ]);

    // Calcular o novo total
    const valor_total = (parseFloat(valor_unitario) * parseInt(quantidade)).toFixed(2);

    // Atualizar os dados da saída
    await pool.query(
      'UPDATE saidas SET numero_nota = ?, id_produto = ?, quantidade = ?, valor_unitario = ?, valor_total = ? WHERE id = ?',
      [numero_nota || null, id_produto, quantidade, valor_unitario, valor_total, id]
    );

    // Atualizar o estoque com a nova quantidade (subtraindo novamente)
    await pool.query('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [
      quantidade,
      id_produto,
    ]);

    res.json({ message: 'Saída atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar saída.' });
  }
});

// ✅ Deletar uma saída
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a saída antes de excluir
    const [rows] = await pool.query('SELECT * FROM saidas WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Saída não encontrada.' });
    const saida = rows[0];

    // Repor o estoque
    await pool.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [
      saida.quantidade,
      saida.id_produto,
    ]);

    // Excluir a saída
    await pool.query('DELETE FROM saidas WHERE id = ?', [id]);
    res.json({ message: 'Saída excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao excluir saída.' });
  }
});

module.exports = router;
