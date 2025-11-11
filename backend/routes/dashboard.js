const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

function monthString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

router.get('/entradas', auth, async (req, res) => {
  const month = req.query.month || monthString();
  try {
    const [rows] = await pool.query('SELECT IFNULL(SUM(valor_total),0) as total FROM entradas WHERE DATE_FORMAT(data,"%Y-%m") = ?', [month]);
    res.json({ total: rows[0].total });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error de Servidor.' }); }
});

router.get('/saidas', auth, async (req, res) => {
  const month = req.query.month || monthString();
  try {
    const [rows] = await pool.query('SELECT IFNULL(SUM(valor_total),0) as total FROM saidas WHERE DATE_FORMAT(data,"%Y-%m") = ?', [month]);
    res.json({ total: rows[0].total });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error de Servidor.' }); }
});

router.get('/saldo', auth, async (req, res) => {
  const month = req.query.month || monthString();
  try {
    const [e] = await pool.query('SELECT IFNULL(SUM(valor_total),0) as total FROM entradas WHERE DATE_FORMAT(data,"%Y-%m") = ?', [month]);
    const [s] = await pool.query('SELECT IFNULL(SUM(valor_total),0) as total FROM saidas WHERE DATE_FORMAT(data,"%Y-%m") = ?', [month]);
    const saldo = parseFloat(s[0].total) - parseFloat(e[0].total);
    res.json({ entradas: parseFloat(s[0].total), saidas: parseFloat(e[0].total), saldo: saldo.toFixed(2) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error de Servidor.' }); }
});

module.exports = router;
