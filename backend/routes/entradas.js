const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * CRIAR ENTRADA
 * Aumenta o estoque do produto correspondente
 */
router.post('/', auth, async (req, res) => {
  const { numero_nota, id_produto, quantidade, valor_unitario } = req.body;
  if (!id_produto || !quantidade || !valor_unitario)
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

  const valor_total = (parseFloat(valor_unitario) * parseInt(quantidade)).toFixed(2);

  try {
    // Insere a entrada
    await pool.query(
      'INSERT INTO entradas (numero_nota, id_produto, quantidade, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?)',
      [numero_nota || null, id_produto, quantidade, valor_unitario, valor_total]
    );

    // Atualiza o estoque (aumenta)
    await pool.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [
      quantidade,
      id_produto
    ]);

    res.json({ message: 'Entrada cadastrada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao cadastrar entrada.' });
  }
});

/**
 * LISTAR ENTRADAS
 * Aceita filtro opcional ?month=YYYY-MM
 */
router.get('/', auth, async (req, res) => {
  const { month } = req.query;
  let sql = 'SELECT e.*, p.descricao FROM entradas e JOIN produtos p ON e.id_produto = p.id';
  const params = [];

  if (month) {
    sql += ' WHERE DATE_FORMAT(e.data, "%Y-%m") = ?';
    params.push(month);
  }

  sql += ' ORDER BY e.data DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao listar entradas.' });
  }
});

/**
 * EDITAR ENTRADA
 * Atualiza a entrada e ajusta o estoque conforme a diferença de quantidade
 */
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { numero_nota, id_produto, quantidade, valor_unitario } = req.body;

  if (!id_produto || !quantidade || !valor_unitario)
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

  try {
    // Busca a entrada antiga para ajustar o estoque
    const [[entradaAntiga]] = await pool.query('SELECT * FROM entradas WHERE id = ?', [id]);
    if (!entradaAntiga)
      return res.status(404).json({ message: 'Entrada não encontrada.' });

    const diff = quantidade - entradaAntiga.quantidade;

    // Atualiza a entrada
    const valor_total = (parseFloat(valor_unitario) * parseInt(quantidade)).toFixed(2);
    await pool.query(
      'UPDATE entradas SET numero_nota=?, id_produto=?, quantidade=?, valor_unitario=?, valor_total=? WHERE id=?',
      [numero_nota || null, id_produto, quantidade, valor_unitario, valor_total, id]
    );

    // Ajusta o estoque conforme a diferença
    await pool.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [
      diff,
      id_produto
    ]);

    res.json({ message: 'Entrada atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao editar entrada.' });
  }
});

/**
 * EXCLUIR ENTRADA
 * Remove a entrada e reverte o estoque do produto
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Busca a entrada antes de excluir
    const [[entrada]] = await pool.query('SELECT * FROM entradas WHERE id = ?', [id]);
    if (!entrada)
      return res.status(404).json({ message: 'Entrada não encontrada.' });

    // Reverte o estoque
    await pool.query('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [
      entrada.quantidade,
      entrada.id_produto
    ]);

    // Exclui a entrada
    await pool.query('DELETE FROM entradas WHERE id = ?', [id]);

    res.json({ message: 'Entrada excluída e estoque ajustado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao excluir entrada.' });
  }
});

module.exports = router;
