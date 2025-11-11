const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const secret = process.env.JWT_SECRET || 'verysecretkey';

// login
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ message: 'Loguin e senha requeridos.' });

  try {
    const [rows] = await pool.query('SELECT u.id, u.nome, u.senha, u.id_grupo, g.nome as grupo_nome FROM usuarios u JOIN grupos g ON u.id_grupo = g.id WHERE u.login = ?', [login]);
    if (!rows || rows.length === 0) return res.status(401).json({ message: 'Credenciais Inválidas.' });

    const user = rows[0];
    const passOk = await bcrypt.compare(senha, user.senha);
    if (!passOk) return res.status(401).json({ message: 'Credenciais Inválidas.' });

// token com validade total de 1 hora
const token = jwt.sign(
  { id: user.id, nome: user.nome, id_grupo: user.id_grupo },
  secret,
  { expiresIn: '1h' } // 1 hora de validade total
);

    res.json({
      token,
      user: { id: user.id, nome: user.nome, id_grupo: user.id_grupo, grupo_nome: user.grupo_nome }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de Servidor' });
  }
});

// Para criar o usuario Admin se o mesmo não existir
router.post('/seed-admin', async (req, res) => {
  try {
    const [u] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    if (u[0].total > 0) return res.status(400).json({ message: 'Usuarios already exist' });

    // Garatem que os grupos existam
    await pool.query("INSERT IGNORE INTO grupos (id, nome) VALUES (1, 'Admin'), (2, 'Usuario')");

    const { nome = 'Admin', login = 'admin', senha = 'admin123' } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const [ins] = await pool.query('INSERT INTO usuarios (nome, login, senha, id_grupo) VALUES (?, ?, ?, ?)', [nome, login, hash, 1]);
    res.json({ message: 'Admin criado', id: ins.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de Servidor' });
  }
});

module.exports = router;
