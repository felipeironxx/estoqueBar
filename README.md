🧾 README – Sistema de Controle de Estoque (Bar)

📌 Sobre o Projeto

Este projeto é um Sistema de Controle de Estoque desenvolvido para auxiliar pequenos estabelecimentos — como bares, mercearias e comércios locais — no gerenciamento de produtos, entradas, saídas, usuários, relatórios e indicadores gerais.

A aplicação foi construída com foco em:

simplicidade,

segurança,

usabilidade,

manutenção facilitada,

execução local em ambiente Linux ou Windows com Docker.

🛠️ Tecnologias Utilizadas

- Frontend

HTML5 – Estrutura da interface.

CSS3 – Estilização e layout responsivo.

JavaScript (Vanilla JS) – Operações dinâmicas, chamadas à API e manipulação de DOM.

- Backend

Node.js – Ambiente de execução JavaScript.

Express.js – Criação de rotas e lógica da API.

MySQL – Banco relacional utilizado para produtos, entradas, saídas e usuários.

JWT (JSON Web Token) – Autenticação segura por token.

- Infraestrutura

Docker (opcional) – Para padronizar ambiente de execução.

Git + GitHub – Controle de versão e atualizações remotas.

📂 Estrutura do Projeto

/api
  ├── routes
  │     ├── produtos.js
  │     ├── entradas.js
  │     ├── saidas.js
  │     ├── usuarios.js
  │     ├── relatorio.js
  │     └── dashboard.js
  ├── middleware
  │     └── auth.js
  ├── db.js
  └── server.js

/frontend
  ├── index.html
  ├── produtos.html
  ├── entradas.html
  ├── saidas.html
  ├── usuarios.html
  ├── relatorios.html
  └── assets
        ├── css/style.css
        └── js/app.js

/docker
  ├── docker-compose.yml
  └── Dockerfile

⚙️ Pré-Requisitos

- Sem Docker:

Node.js 18+

MySQL 8+

Git

- Com Docker:

Docker 24+

Docker Compose plugin

🚀 Instalação (Sem Docker)

1. Clone o repositório

git clone https://github.com/usuario/repositorio.git
cd repositorio

2. Instale as dependências

cd api
npm install

3. Configure o banco de dados

Crie um banco MySQL e execute o arquivo:

database.sql

4. Configure o arquivo .env

JWT_SECRET=algum_segredo_aleatorio
DB_HOST=localhost
DB_USER=root
DB_PASS=senha
DB_NAME=estoque_db

5. Inicie o backend

npm start

6. Abra o frontend

Basta abrir o arquivo:

/frontend/login.html

ou servir com Live Server.

🐳 Instalação (Com Docker)

1. Clone o repositório

git clone https://github.com/usuario/repositorio.git
cd repositorio

2. Execute os containers

Criar a Imagem: docker-compose up --build -d
Executar os Containers: docker-compose up -d

- O ambiente subirá:

API Node em http://localhost:3000

MySQL em localhost:3306

Frontend em http://localhost:8080

🔐 Login Padrão

💡 Passo a passo pra criar o primeiro Admin:

Suba o backend e o MySQL via Docker Compose.
Depois que o container do Node estiver rodando, ele vai expor a API em:

http://localhost:3000

Abra o Postman (ou Insomnia).

Crie uma requisição:

POST http://localhost:3000/api/usuarios

No Body, escolha “raw” + “JSON”, e envie:

{
  "nome": "Administrador",
  "login": "admin",
  "senha": "123456",
  "id_grupo": 1
}

O backend vai criptografar a senha com bcrypt e salvar o admin.


Usuário	Senha	Grupo
admin	admin123	Administrador

📊 Funcionalidades

✔ Controle de Produtos

* Cadastro
* Edição
* Ativação / Inativação
* Estoque em tempo real

✔ Entradas

* Registro de compras
* Atualização automática do estoque

✔ Saídas

* Registro de consumo/vendas
* Baixa automática do estoque

✔ Usuários

* Administração completa
* Troca de senha
* Controle de acesso por nível

✔ Relatórios

* Entradas e saídas por período
* Totais de valor e quantidade
* Exportação PDF e CSV

✔ Dashboard

* Indicadores financeiros mensais
* Últimas entradas e saídas

🧪 Testes e Validações

A API retorna mensagens de validação quando:

* Campos obrigatórios estiverem ausentes,
* Estoque for insuficiente,
* Token JWT estiver expirado,
* Operação estiver fora das regras do sistema.

🔧 Manutenção e Atualizações

Para atualizar o sistema na máquina do cliente:

- Sem Docker

git pull
npm install
pm2 restart all

- Com Docker

git pull
docker-compose down
docker-compose up --build -d

📜 Licença

Este projeto é de uso acadêmico e pode ser adaptado livremente.