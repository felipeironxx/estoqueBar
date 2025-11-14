require('dotenv').config();
const express = require('express');
const cors = require('cors');

//rotas
const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const entradasRoutes = require('./routes/entradas');
const saidasRoutes = require('./routes/saidas');
const relatorioRoutes = require('./routes/relatorio');
const usersRoutes = require('./routes/usuarios');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// 🔧 Configuração detalhada do CORS
app.use(cors({
  origin: '*', // liberar para todos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// para garantir que preflight OPTIONS funcione corretamente
app.options('*', cors());


app.use(express.json());

// rotas
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/saidas', saidasRoutes);
app.use('/api/usuarios', usersRoutes);
app.use('/api/relatorio', relatorioRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
