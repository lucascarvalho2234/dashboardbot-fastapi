# FarmMoneyRich - Sistema Completo de Gerenciamento de Bots

Sistema completo para gerenciamento de bots do Telegram com interface web moderna, API REST e banco de dados PostgreSQL.

## 🚀 Funcionalidades

### ✅ **API Completa (Back-end)**
- **Endpoints de Bots**: CRUD completo para gerenciamento de bots
- **Endpoints de Gateways**: Gerenciamento de gateways de pagamento
- **Sistema de Logs**: Registro e visualização de logs em tempo real
- **Estatísticas**: Dashboard com métricas do sistema
- **Segurança**: Criptografia de tokens e chaves de API
- **Background Tasks**: Processamento assíncrono para operações longas

### ✅ **Interface Web (Front-end)**
- **Dashboard Interativo**: Visão geral com estatísticas em tempo real
- **Gerenciamento de Bots**: Criar, editar, ativar/desativar bots
- **Editor de Código**: Editor integrado para código Python dos bots
- **Upload de Arquivos**: Suporte para upload de arquivos .py
- **Gerenciamento de Gateways**: CRUD completo para gateways
- **Teste de Conexão**: Verificação automática de conectividade
- **Sistema de Logs**: Console em tempo real com filtros
- **Modo Escuro/Claro**: Interface adaptável
- **Design Responsivo**: Funciona em desktop e mobile

### ✅ **Banco de Dados**
- **PostgreSQL**: Banco robusto e escalável
- **Tabelas Estruturadas**: Bots, Gateways e Logs
- **Relacionamentos**: Foreign keys e integridade referencial
- **Criptografia**: Dados sensíveis protegidos
- **Timestamps**: Controle de criação e atualização

## 🛠️ Tecnologias Utilizadas

### Back-end
- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM para banco de dados
- **PostgreSQL**: Banco de dados relacional
- **Cryptography**: Criptografia de dados sensíveis
- **Uvicorn**: Servidor ASGI de alta performance
- **Pydantic**: Validação de dados

### Front-end
- **HTML5/CSS3**: Estrutura e estilização
- **JavaScript ES6+**: Lógica da interface
- **Tailwind CSS**: Framework CSS utilitário
- **Lucide Icons**: Ícones modernos
- **Fetch API**: Comunicação com a API

## 📦 Estrutura do Projeto

```
farmmoneyrich/
├── app.py                 # API principal (FastAPI)
├── requirements.txt       # Dependências Python
├── Procfile              # Configuração para deploy (Render)
├── runtime.txt           # Versão do Python
├── .env.example          # Exemplo de variáveis de ambiente
├── static/               # Arquivos estáticos
│   ├── index.html        # Interface web
│   └── app.js           # JavaScript da interface
└── README.md            # Documentação
```

## 🚀 Como Executar

### 1. Configuração Local

```bash
# Clonar o repositório
git clone <seu-repositorio>
cd farmmoneyrich

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar o servidor
python app.py
```

### 2. Deploy na Render

1. **Criar conta na Render**: https://render.com
2. **Criar PostgreSQL Database**:
   - Nome: `farmmoneyrich-db`
   - Copiar a `DATABASE_URL`

3. **Criar Web Service**:
   - Conectar ao seu repositório GitHub
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`

4. **Configurar Variáveis de Ambiente**:
   ```
   DATABASE_URL=<sua-database-url-do-render>
   ENCRYPTION_KEY=<gerar-nova-chave>
   PORT=8000
   ```

5. **Gerar Chave de Criptografia**:
   ```python
   from cryptography.fernet import Fernet
   print(Fernet.generate_key().decode())
   ```

## 📋 Endpoints da API

### Estatísticas
- `GET /api/stats` - Estatísticas gerais do sistema

### Bots
- `GET /api/bots` - Listar todos os bots
- `POST /api/bots` - Criar novo bot
- `PUT /api/bots/{id}` - Atualizar bot
- `DELETE /api/bots/{id}` - Excluir bot
- `POST /api/bots/{id}/toggle` - Ativar/desativar bot
- `POST /api/bots/{id}/restart` - Reiniciar bot

### Gateways
- `GET /api/gateways` - Listar todos os gateways
- `POST /api/gateways` - Criar novo gateway
- `PUT /api/gateways/{id}` - Atualizar gateway
- `DELETE /api/gateways/{id}` - Excluir gateway
- `POST /api/gateways/{id}/test` - Testar conexão

### Logs
- `GET /api/logs` - Listar logs (últimos 100)
- `POST /api/logs` - Criar novo log
- `DELETE /api/logs` - Limpar todos os logs

### Saúde
- `GET /api/health` - Status da API
- `GET /` - Informações básicas

## 🔒 Segurança

- **Criptografia**: Tokens e chaves de API são criptografados no banco
- **Validação**: Todos os dados são validados com Pydantic
- **CORS**: Configurado para permitir acesso do front-end
- **Sanitização**: Prevenção contra SQL injection via SQLAlchemy

## 📊 Banco de Dados

### Tabela `bots`
```sql
CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    token TEXT NOT NULL,  -- Criptografado
    code TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    gateway_id INTEGER REFERENCES gateways(id),
    process_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `gateways`
```sql
CREATE TABLE gateways (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    api_url VARCHAR NOT NULL,
    api_key TEXT NOT NULL,  -- Criptografado
    status VARCHAR DEFAULT 'Erro',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `logs`
```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR NOT NULL,
    message TEXT NOT NULL,
    bot_id INTEGER REFERENCES bots(id),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Próximos Passos

1. **Implementar execução real dos bots**: Integrar com subprocess para executar código Python
2. **Sistema de usuários**: Autenticação e autorização
3. **Webhooks**: Receber notificações de gateways
4. **Métricas avançadas**: Gráficos e relatórios
5. **Backup automático**: Sistema de backup do banco de dados
6. **Monitoramento**: Health checks e alertas
7. **API de terceiros**: Integração com mais gateways de pagamento

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs da aplicação
2. Confirme as variáveis de ambiente
3. Teste a conectividade com o banco de dados
4. Verifique a documentação da API em `/docs` (Swagger UI automático)

---

**Sistema desenvolvido para gerenciamento profissional de bots do Telegram com interface moderna e arquitetura escalável.**