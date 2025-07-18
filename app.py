from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
import subprocess
import signal
import json
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/farmmoneyrich")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Chave de criptografia
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# Modelos do banco de dados
class Gateway(Base):
    __tablename__ = "gateways"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    api_url = Column(String, nullable=False)
    api_key = Column(Text, nullable=False)  # Será criptografado
    status = Column(String, default="Erro")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento
    bots = relationship("Bot", back_populates="gateway")

class Bot(Base):
    __tablename__ = "bots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    token = Column(Text, nullable=False)  # Será criptografado
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
    level = Column(String, nullable=False)  # info, warning, error, success
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

class GatewayUpdate(GatewayBase):
    pass

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

class BotUpdate(BotBase):
    pass

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
    success_rate: float

# Dependência para obter sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Funções utilitárias
def encrypt_data(data: str) -> str:
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    return cipher_suite.decrypt(encrypted_data.encode()).decode()

def add_log(db: Session, level: str, message: str, bot_id: Optional[int] = None):
    log = Log(level=level, message=message, bot_id=bot_id)
    db.add(log)
    db.commit()
    logger.info(f"Log adicionado: {level} - {message}")

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

# Servir arquivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Endpoints da API

# === ESTATÍSTICAS ===
@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_bots = db.query(Bot).count()
    active_bots = db.query(Bot).filter(Bot.is_active == True).count()
    total_gateways = db.query(Gateway).count()
    connected_gateways = db.query(Gateway).filter(Gateway.status == "Conectado").count()
    
    return StatsResponse(
        total_revenue=0.0,  # Implementar lógica de receita
        total_transactions=0,  # Implementar lógica de transações
        active_bots=active_bots,
        total_bots=total_bots,
        connected_gateways=connected_gateways,
        total_gateways=total_gateways,
        success_rate=0.0  # Implementar lógica de taxa de sucesso
    )

# === GATEWAYS ===
@app.get("/api/gateways", response_model=List[GatewayResponse])
def get_gateways(db: Session = Depends(get_db)):
    gateways = db.query(Gateway).all()
    return gateways

@app.post("/api/gateways", response_model=GatewayResponse)
def create_gateway(gateway: GatewayCreate, db: Session = Depends(get_db)):
    # Criptografar a API key
    encrypted_key = encrypt_data(gateway.api_key)
    
    db_gateway = Gateway(
        name=gateway.name,
        type=gateway.type,
        api_url=gateway.api_url,
        api_key=encrypted_key
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
    
    # Criptografar a nova API key
    encrypted_key = encrypt_data(gateway.api_key)
    
    db_gateway.name = gateway.name
    db_gateway.type = gateway.type
    db_gateway.api_url = gateway.api_url
    db_gateway.api_key = encrypted_key
    
    db.commit()
    db.refresh(db_gateway)
    
    add_log(db, "success", f"Gateway '{gateway.name}' atualizado com sucesso")
    
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
    
    # Simular teste de conexão em background
    def test_connection():
        import time
        import random
        time.sleep(2)  # Simular tempo de teste
        
        # Simular resultado do teste
        success = random.choice([True, True, True, False])  # 75% de sucesso
        
        db_session = SessionLocal()
        try:
            gateway = db_session.query(Gateway).filter(Gateway.id == gateway_id).first()
            if gateway:
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
    # Descriptografar tokens para exibição (apenas últimos 4 caracteres)
    for bot in bots:
        try:
            decrypted_token = decrypt_data(bot.token)
            bot.token = f"{decrypted_token[:4]}...{decrypted_token[-4:]}"
        except:
            bot.token = "****...****"
    return bots

@app.post("/api/bots", response_model=BotResponse)
def create_bot(bot: BotCreate, db: Session = Depends(get_db)):
    # Criptografar o token
    encrypted_token = encrypt_data(bot.token)
    
    db_bot = Bot(
        name=bot.name,
        token=encrypted_token,
        code=bot.code,
        gateway_id=bot.gateway_id
    )
    
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    
    add_log(db, "success", f"Bot '{bot.name}' criado com sucesso", db_bot.id)
    
    # Mascarar token na resposta
    db_bot.token = f"{bot.token[:4]}...{bot.token[-4:]}"
    
    return db_bot

@app.put("/api/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: int, bot: BotUpdate, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    # Criptografar o novo token
    encrypted_token = encrypt_data(bot.token)
    
    db_bot.name = bot.name
    db_bot.token = encrypted_token
    db_bot.code = bot.code
    db_bot.gateway_id = bot.gateway_id
    db_bot.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_bot)
    
    add_log(db, "success", f"Bot '{bot.name}' atualizado com sucesso", bot_id)
    
    # Mascarar token na resposta
    db_bot.token = f"{bot.token[:4]}...{bot.token[-4:]}"
    
    return db_bot

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    # Parar o bot se estiver ativo
    if db_bot.is_active and db_bot.process_id:
        try:
            os.kill(db_bot.process_id, signal.SIGTERM)
        except:
            pass
    
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
        def start_bot():
            # Aqui você implementaria a lógica para iniciar o bot
            # Por exemplo, criar um arquivo temporário com o código e executá-lo
            add_log(db, "success", f"Bot '{db_bot.name}' ativado", bot_id)
        
        background_tasks.add_task(start_bot)
        add_log(db, "info", f"Ativando bot '{db_bot.name}'...", bot_id)
    else:
        # Desativar bot
        if db_bot.process_id:
            try:
                os.kill(db_bot.process_id, signal.SIGTERM)
                db_bot.process_id = None
            except:
                pass
        add_log(db, "info", f"Bot '{db_bot.name}' desativado", bot_id)
    
    db_bot.is_active = new_status
    db.commit()
    
    return {"message": f"Bot {'ativado' if new_status else 'desativado'} com sucesso"}

@app.post("/api/bots/{bot_id}/restart")
def restart_bot(bot_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot não encontrado")
    
    add_log(db, "info", f"Reiniciando bot '{db_bot.name}'...", bot_id)
    
    def restart_process():
        import time
        # Parar processo atual se existir
        if db_bot.process_id:
            try:
                os.kill(db_bot.process_id, signal.SIGTERM)
            except:
                pass
        
        time.sleep(1)  # Aguardar processo parar
        
        # Reiniciar se estiver ativo
        if db_bot.is_active:
            # Implementar lógica de reinício aqui
            pass
        
        db_session = SessionLocal()
        try:
            add_log(db_session, "success", f"Bot '{db_bot.name}' reiniciado com sucesso", bot_id)
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

# Endpoint raiz
@app.get("/")
def read_root():
    return {"message": "FarmMoneyRich API está funcionando!", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))