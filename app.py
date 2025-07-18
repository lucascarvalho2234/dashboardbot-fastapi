from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import json
import logging
import tempfile
import subprocess
import signal
import threading
import time
import requests
import sys
import os
from pathlib import Path

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do banco de dados SQLite local
DATABASE_URL = "sqlite:///./farmmoneyrich.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dicionário para armazenar processos dos bots
bot_processes = {}

# Modelos do banco de dados
class Gateway(Base):
    __tablename__ = "gateways"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    api_url = Column(String, nullable=False)
    api_key = Column(Text, nullable=False)
    status = Column(String, default="Erro")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento
    bots = relationship("Bot", back_populates="gateway")

class Bot(Base):
    __tablename__ = "bots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    token = Column(Text, nullable=False)
    code = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False)
    gateway_id = Column(Integer, ForeignKey("gateways.id"), nullable=True)
    process_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento
    gateway = relationship("Gateway", back_populates="bots")
    logs = relationship("Log", back_populates="bot")

class Log(Base):
    __tablename__ = "logs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento
    bot = relationship("Bot", back_populates="logs")

# Criar tabelas
Base.metadata.create_all(bind=engine)

# Schemas Pydantic
class GatewayBase(BaseModel):
    name: str
    type: str
    api_url: str
    api_key: str

class GatewayCreate(GatewayBase):
    pass

class GatewayUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None

class GatewayResponse(BaseModel):
    id: int
    name: str
    type: str
    api_url: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class BotBase(BaseModel):
    name: str
    token: str
    code: Optional[str] = ""
    gateway_id: Optional[int] = None

class BotCreate(BotBase):
    pass

class BotUpdate(BaseModel):
    name: Optional[str] = None
    token: Optional[str] = None
    code: Optional[str] = None
    gateway_id: Optional[int] = None

class BotResponse(BaseModel):
    id: int
    name: str
    token: str
    code: Optional[str]
    is_active: bool
    gateway_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LogCreate(BaseModel):
    level: str
    message: str
    bot_id: Optional[int] = None

class LogResponse(BaseModel):
    id: int
    level: str
    message: str
    bot_id: Optional[int]
    timestamp: datetime
    
    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_revenue: float
    total_transactions: int
    active_bots: int
    total_bots: int
    connected_gateways: int
    total_gateways: int

# Dependência para obter sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Funções utilitárias
def add_log(db: Session, level: str, message: str, bot_id: Optional[int] = None):
    log = Log(level=level, message=message, bot_id=bot_id)
    db.add(log)
    db.commit()
    logger.info(f"Log adicionado: {level} - {message}")

def stop_bot_process(bot_id: int):
    """Para o processo de um bot"""
    if bot_id in bot_processes:
        process = bot_processes[bot_id]
        try:
            process.terminate()
            process.wait(timeout=5)
        except:
            try:
                process.kill()
            except:
                pass
        finally:
            del bot_processes[bot_id]

def start_bot_process(bot_id: int, bot_code: str, bot_token: str, db: Session):
    """Inicia o processo de um bot"""
    try:
        # Criar arquivo temporário com o código do bot
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            # Substituir o token no código
            code_with_token = bot_code.replace('SEU_TOKEN_AQUI', bot_token)
            code_with_token = code_with_token.replace('YOUR_TOKEN_HERE', bot_token)
            code_with_token = code_with_token.replace('BOT_TOKEN = "SEU_TOKEN_AQUI"', f'BOT_TOKEN = "{bot_token}"')
            f.write(code_with_token)
            temp_file = f.name
        
        # Iniciar processo do bot
        process = subprocess.Popen([
            sys.executable, temp_file
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        bot_processes[bot_id] = process
        
        # Thread para monitorar o processo
        def monitor_process():
            try:
                stdout, stderr = process.communicate(timeout=1)
                if stderr:
                    add_log(db, "error", f"Bot {bot_id} erro: {stderr}", bot_id)
                if stdout:
                    add_log(db, "info", f"Bot {bot_id} output: {stdout}", bot_id)
            except subprocess.TimeoutExpired:
                # Bot ainda está rodando
                add_log(db, "success", f"Bot {bot_id} iniciado com sucesso", bot_id)
            except Exception as e:
                add_log(db, "error", f"Bot {bot_id} erro no monitoramento: {str(e)}", bot_id)
            finally:
                # Limpar arquivo temporário
                try:
                    os.unlink(temp_file)
                except:
                    pass
        
        threading.Thread(target=monitor_process, daemon=True).start()
        
        return True
    except Exception as e:
        add_log(db, "error", f"Erro ao iniciar bot {bot_id}: {str(e)}", bot_id)
        return False

# Inicializar FastAPI
app = FastAPI(title="FarmMoneyRich API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints da API

# === ESTATÍSTICAS ===
@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_bots = db.query(Bot).count()
    active_bots = db.query(Bot).filter(Bot.is_active == True).count()
    total_gateways = db.query(Gateway).count()
    connected_gateways = db.query(Gateway).filter(Gateway.status == "Conectado").count()
    
    return StatsResponse(
        total_revenue=1250.75,  # Valor exemplo
        total_transactions=42,  # Valor exemplo
        active_bots=active_bots,
        total_bots=total_bots,
        connected_gateways=connected_gateways,
        total_gateways=total_gateways
    )

# === GATEWAYS ===
@app.get("/api/gateways", response_model=List[GatewayResponse])
def get_gateways(db: Session = Depends(get_db)):
    gateways = db.query(Gateway).all()
    return gateways

@app.post("/api/gateways", response_model=GatewayResponse)
def create_gateway(gateway: GatewayCreate, db: Session = Depends(get_db)):
    db_gateway = Gateway(
        name=gateway.name,
        type=gateway.type,
        api_url=gateway.api_url,
        api_key=gateway.api_key
    )
    
    db.add(db_gateway)
    db.commit()
    db.refresh(db_gateway)
    
    add_log(db, "success", f"Gateway '{gateway.name}' criado com sucesso")
    
    return db_gateway

@app.put("/api/gateways/{gateway_id}", response_model=GatewayResponse)
def update_gateway(gateway_id: int, gateway: GatewayUpdate, db: Session = Depends(get_db)):
    db_gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(status_code=404, detail="Gateway não encontrado")
    
    if gateway.name is not None:
        db_gateway.name = gateway.name
    if gateway.type is not None:
        db_gateway.type = gateway.type
    if gateway.api_url is not None:
        db_gateway.api_url = gateway.api_url
    if gateway.api_key is not None:
        db_gateway.api_key = gateway.api_key
    
    db.commit()
    db.refresh(db_gateway)
    
    add_log(db, "success", f"Gateway '{db_gateway.name}' atualizado com sucesso")
    
    return db_gateway

@app.delete("/api/gateways/{gateway_id}")
def delete_gateway(gateway_id: int, db: Session = Depends(get_db)):
    db_gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(status_code=404, detail="Gateway não encontrado")
    
    gateway_name = db_gateway.name
    db.delete(db_gateway)
    db.commit()
    
    add_log(db, "warning", f"Gateway '{gateway_name}' excluído")
    
    return {"message": "Gateway excluído com sucesso"}

@app.post("/api/gateways/{gateway_id}/test")
def test_gateway_connection(gateway_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(status_code=404, detail="Gateway não encontrado")
    
    # Atualizar status para "Testando"
    db_gateway.status = "Testando"
    db.commit()
    
    add_log(db, "info", f"Testando conexão com gateway '{db_gateway.name}'...")
    
    def test_connection():
        time.sleep(2)  # Simular tempo de teste
        
        db_session = SessionLocal()
        try:
            gateway = db_session.query(Gateway).filter(Gateway.id == gateway_id).first()
            if gateway:
                # Tentar fazer uma requisição para testar a conexão
                try:
                    response = requests.get(gateway.api_url, timeout=5)
                    success = response.status_code < 500
                except:
                    success = False
                
                gateway.status = "Conectado" if success else "Erro"
                db_session.commit()
                
                add_log(db_session, 
                       "success" if success else "error",
                       f"Gateway '{gateway.name}' {'conectado com sucesso' if success else 'falhou na conexão'}")
        finally:
            db_session.close()
    
    background_tasks.add_task(test_connection)
    
    return {"message": "Teste de conexão iniciado"}

# === BOTS ===
@app.get("/api/bots", response_model=List[BotResponse])
def get_bots(db: Session = Depends(get_db)):
    bots = db.query(Bot).all()
    return bots

@app.post("/api/bots", response_model=BotResponse)
def create_bot(bot: BotCreate, db: Session = Depends(get_db)):
    db_bot = Bot(
        name=bot.name,
        token=bot.token,
        code=bot.code,
        gateway_id=bot.gateway_id
    )
    
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    
    add_log(db, "success", f"Bot '{bot.name}' criado com sucesso", db_bot.id)
    
    return db_bot

@app.put("/api/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: int, bot: BotUpdate, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    if bot.name is not None:
        db_bot.name = bot.name
    if bot.token is not None:
        db_bot.token = bot.token
    if bot.code is not None:
        db_bot.code = bot.code
    if bot.gateway_id is not None:
        db_bot.gateway_id = bot.gateway_id
    
    db_bot.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_bot)
    
    add_log(db, "success", f"Bot '{db_bot.name}' atualizado com sucesso", bot_id)
    
    return db_bot

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    # Parar o bot se estiver ativo
    if db_bot.is_active:
        stop_bot_process(bot_id)
    
    bot_name = db_bot.name
    db.delete(db_bot)
    db.commit()
    
    add_log(db, "warning", f"Bot '{bot_name}' excluído")
    
    return {"message": "Bot excluído com sucesso"}

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot_status(bot_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    new_status = not db_bot.is_active
    
    if new_status:
        # Ativar bot
        if db_bot.code and db_bot.token:
            def start_bot():
                db_session = SessionLocal()
                try:
                    success = start_bot_process(bot_id, db_bot.code, db_bot.token, db_session)
                    if success:
                        bot = db_session.query(Bot).filter(Bot.id == bot_id).first()
                        if bot:
                            bot.is_active = True
                            db_session.commit()
                finally:
                    db_session.close()
            
            background_tasks.add_task(start_bot)
            add_log(db, "info", f"Ativando bot '{db_bot.name}'...", bot_id)
        else:
            raise HTTPException(status_code=400, detail="Bot precisa ter código e token para ser ativado")
    else:
        # Desativar bot
        stop_bot_process(bot_id)
        db_bot.is_active = False
        add_log(db, "info", f"Bot '{db_bot.name}' desativado", bot_id)
    
    if not new_status:  # Só atualizar se for desativar (ativar é feito no background)
        db_bot.is_active = new_status
        db.commit()
    
    return {"message": f"Bot {'sendo ativado' if new_status else 'desativado'} com sucesso"}

@app.post("/api/bots/{bot_id}/restart")
def restart_bot(bot_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    add_log(db, "info", f"Reiniciando bot '{db_bot.name}'...", bot_id)
    
    def restart_process():
        db_session = SessionLocal()
        try:
            # Parar processo atual
            stop_bot_process(bot_id)
            time.sleep(1)
            
            # Reiniciar se estiver ativo e tiver código
            bot = db_session.query(Bot).filter(Bot.id == bot_id).first()
            if bot and bot.is_active and bot.code and bot.token:
                success = start_bot_process(bot_id, bot.code, bot.token, db_session)
                if success:
                    add_log(db_session, "success", f"Bot '{bot.name}' reiniciado com sucesso", bot_id)
                else:
                    add_log(db_session, "error", f"Falha ao reiniciar bot '{bot.name}'", bot_id)
        finally:
            db_session.close()
    
    background_tasks.add_task(restart_process)
    
    return {"message": "Reinício do bot iniciado"}

# === LOGS ===
@app.get("/api/logs", response_model=List[LogResponse])
def get_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(Log).order_by(Log.timestamp.desc()).limit(limit).all()
    return logs

@app.post("/api/logs", response_model=LogResponse)
def create_log(log: LogCreate, db: Session = Depends(get_db)):
    db_log = Log(
        level=log.level,
        message=log.message,
        bot_id=log.bot_id
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return db_log

@app.delete("/api/logs")
def clear_logs(db: Session = Depends(get_db)):
    db.query(Log).delete()
    db.commit()
    
    add_log(db, "info", "Logs limpos pelo usuário")
    
    return {"message": "Logs limpos com sucesso"}

# Endpoint de saúde
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Servir arquivos estáticos do React
@app.mount("/static", StaticFiles(directory="static"), name="static")

# Endpoint raiz - servir o React app
@app.get("/")
def read_root():
    return FileResponse('static/index.html')

# Inicializar dados de exemplo
def init_sample_data():
    db = SessionLocal()
    try:
        # Verificar se já existem dados
        if db.query(Gateway).count() == 0:
            # Criar gateway de exemplo
            sample_gateway = Gateway(
                name="Gateway de Teste",
                type="BTCPay Server",
                api_url="https://demo.btcpayserver.org",
                api_key="test_key_123",
                status="Conectado"
            )
            db.add(sample_gateway)
            db.commit()
            
            add_log(db, "info", "Gateway de exemplo criado")
        
        if db.query(Bot).count() == 0:
            # Criar bot de exemplo
            sample_code = '''import telebot
import time
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Token do bot (será substituído automaticamente)
BOT_TOKEN = "SEU_TOKEN_AQUI"

# Criar instância do bot
bot = telebot.TeleBot(BOT_TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    """Comando /start"""
    welcome_text = """
🤖 *Olá! Eu sou o FarmMoneyRich Bot!*

Comandos disponíveis:
/start - Mostrar esta mensagem
/help - Ajuda
/status - Status do bot
/ping - Testar conexão
/info - Informações do usuário

Desenvolvido com ❤️ pelo sistema FarmMoneyRich
    """
    bot.reply_to(message, welcome_text, parse_mode='Markdown')
    logger.info(f"Usuário {message.from_user.username} iniciou o bot")

@bot.message_handler(commands=['help'])
def send_help(message):
    """Comando /help"""
    help_text = """
📚 *Central de Ajuda*

Este bot foi criado para demonstrar as funcionalidades do sistema FarmMoneyRich.

*Comandos:*
• /start - Iniciar o bot
• /help - Esta mensagem de ajuda
• /status - Ver status do bot
• /ping - Testar se o bot está respondendo
• /info - Ver suas informações

*Recursos:*
• Respostas automáticas
• Logging de atividades
• Integração com gateways de pagamento
• Monitoramento em tempo real

Para mais informações, visite: https://farmmoneyrich.com
    """
    bot.reply_to(message, help_text, parse_mode='Markdown')

@bot.message_handler(commands=['status'])
def send_status(message):
    """Comando /status"""
    status_text = f"""
📊 *Status do Bot*

✅ Bot Online
🕐 Horário: {time.strftime('%H:%M:%S')}
📅 Data: {time.strftime('%d/%m/%Y')}
👤 Usuário: @{message.from_user.username or 'Anônimo'}
🆔 Chat ID: {message.chat.id}

Sistema funcionando perfeitamente! 🚀
    """
    bot.reply_to(message, status_text, parse_mode='Markdown')

@bot.message_handler(commands=['ping'])
def send_ping(message):
    """Comando /ping"""
    bot.reply_to(message, "🏓 Pong! Bot está online e funcionando!")

@bot.message_handler(commands=['info'])
def send_info(message):
    """Comando /info"""
    user = message.from_user
    info_text = f"""
👤 *Suas Informações*

🆔 ID: {user.id}
👤 Nome: {user.first_name} {user.last_name or ''}
📱 Username: @{user.username or 'Não definido'}
🌐 Idioma: {user.language_code or 'Não definido'}
💬 Chat ID: {message.chat.id}
📅 Data da mensagem: {time.strftime('%d/%m/%Y %H:%M:%S')}
    """
    bot.reply_to(message, info_text, parse_mode='Markdown')

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    """Responder a todas as outras mensagens"""
    response_text = f"""
💬 Você disse: "{message.text}"

Use /help para ver os comandos disponíveis!
    """
    bot.reply_to(message, response_text)
    logger.info(f"Mensagem recebida de {message.from_user.username}: {message.text}")

# Função principal
def main():
    logger.info("🤖 FarmMoneyRich Bot iniciando...")
    logger.info("✅ Bot configurado e pronto para receber mensagens!")
    
    try:
        # Iniciar polling
        bot.polling(none_stop=True, interval=0, timeout=20)
    except Exception as e:
        logger.error(f"❌ Erro no bot: {e}")
        time.sleep(5)
        main()  # Reiniciar em caso de erro

if __name__ == '__main__':
    main()
'''
            
            sample_bot = Bot(
                name="Bot de Exemplo",
                token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                code=sample_code,
                is_active=False
            )
            db.add(sample_bot)
            db.commit()
            
            add_log(db, "info", "Bot de exemplo criado")
            
    except Exception as e:
        logger.error(f"Erro ao inicializar dados de exemplo: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    
    # Inicializar dados de exemplo
    init_sample_data()
    
    # Iniciar servidor
    uvicorn.run(app, host="0.0.0.0", port=8000)