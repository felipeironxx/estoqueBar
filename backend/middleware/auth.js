const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'verysecretkey';

// Armazena última atividade dos tokens válidos
const activeTokens = {};
const INACTIVITY_WINDOW = 1800; // segundos sem uso (1 min)
const TOKEN_EXPIRATION = '1h'; // tempo total de vida do token

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'Token requerido' });

  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token não informado' });

  try {
    const payload = jwt.verify(token, secret); // só entra aqui se o JWT ainda for válido

    const now = Math.floor(Date.now() / 1000);
    const lastActivity = activeTokens[token] || now;

    // Se passou mais de 60s sem usar, expira
    if (now - lastActivity > INACTIVITY_WINDOW) {
      delete activeTokens[token];
      return res.status(401).json({ message: 'O token expirou devido à inatividade.' });
    }

    // Atualiza a última atividade
    activeTokens[token] = now;

    // Gera um novo token (renovando o tempo total)
    const newToken = jwt.sign(
      { id: payload.id, nome: payload.nome, id_grupo: payload.id_grupo },
      secret,
      { expiresIn: TOKEN_EXPIRATION }
    );

    // Envia o novo token no header (para o front atualizar)
    res.setHeader('x-refresh-token', newToken);

    // Passa o usuário para as rotas protegidas
    req.user = {
      id: payload.id,
      nome: payload.nome,
      id_grupo: payload.id_grupo
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = authMiddleware;
