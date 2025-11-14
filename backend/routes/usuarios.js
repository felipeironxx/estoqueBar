const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const router = express.Router();

function isAdmin(req) {
  return req.user && req.user.id_grupo === 1;
}

router.get('/', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Somente para administradores.' });
  try {
    const [rows] = await pool.query('SELECT id, nome, login, id_grupo FROM usuarios');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de Servidor.' });
  }
});

router.post('/', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Somente para administradores.' });
  const { nome, login, senha, id_grupo } = req.body;
  if (!nome || !login || !senha) return res.status(400).json({ message: 'Campos Ausentes.' });
  try {
    const hash = await bcrypt.hash(senha, 10);
    const [r] = await pool.query(
      'INSERT INTO usuarios (nome, login, senha, id_grupo) VALUES (?, ?, ?, ?)',
      [nome, login, hash, id_grupo || 2]
    );
    res.json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro de Servidor.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Somente para administradores.' });
  const { id } = req.params;
  const { nome, login, senha, id_grupo } = req.body;
  try {
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        'UPDATE usuarios SET nome=?, login=?, senha=?, id_grupo=? WHERE id=?',
        [nome, login, hash, id_grupo, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nome=?, login=?, id_grupo=? WHERE id=?',
        [nome, login, id_grupo, id]
      );
    }
    res.json({ message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Somente para administradores.' });
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;
