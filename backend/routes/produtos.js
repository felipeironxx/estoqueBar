const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 *  Lista produtos (ativos ou inativos)
 * Exemplo:
 *   GET /api/produtos?ativos=true   -> mostra ativos (padrão)
 *   GET /api/produtos?ativos=false  -> mostra inativos
 */
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, descricao, valor, quantidade, ativo FROM produtos'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao listar produtos.' });
  }
});

/**
 *  Cria novo produto
 */
router.post('/', auth, async (req, res) => {
  const { descricao, valor, quantidade } = req.body;
  if (!descricao) return res.status(400).json({ message: 'Descrição é obrigatória.' });

  try {
    const [r] = await pool.query(
      'INSERT INTO produtos (descricao, valor, quantidade, ativo) VALUES (?, ?, ?, 1)',
      [descricao, valor || 0, quantidade || 0]
    );
    res.json({ id: r.insertId, message: 'Produto criado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao criar produto.' });
  }
});

/**
 * Atualiza produto (edição geral)
 */
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, quantidade, ativo } = req.body;

  try {
    if (ativo !== undefined) {
      await pool.query(
        'UPDATE produtos SET descricao=?, valor=?, quantidade=?, ativo=? WHERE id=?',
        [descricao, valor, quantidade, ativo, id]
      );
    } else {
      await pool.query(
        'UPDATE produtos SET descricao=?, valor=?, quantidade=? WHERE id=?',
        [descricao, valor, quantidade, id]
      );
    }
    res.json({ message: 'Produto atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao atualizar produto.' });
  }
});

/**
 * Ativa ou inativa produto 
 * Envie: { "ativo": 0 } ou { "ativo": 1 }
 */
router.patch('/:id/ativo', auth, async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  if (ativo === undefined) {
    return res.status(400).json({ message: 'Campo "ativo" é obrigatório (0 ou 1).' });
  }

  try {
    await pool.query('UPDATE produtos SET ativo=? WHERE id=?', [ativo, id]);
    res.json({ message: `Produto ${ativo ? 'ativado' : 'inativado'} com sucesso.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de servidor ao atualizar status do produto.' });
  }
});

module.exports = router;
