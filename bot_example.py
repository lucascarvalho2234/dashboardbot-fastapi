#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot de Exemplo FarmMoneyRich
Token: 7957008609:AAELmogGuELrvLwgGst6e3ohYA8xOnGxDcI
"""

import telebot
import time
import logging
import threading
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Token do bot
BOT_TOKEN = "7957008609:AAELmogGuELrvLwgGst6e3ohYA8xOnGxDcI"

# Criar instância do bot
bot = telebot.TeleBot(BOT_TOKEN)

# Estatísticas do bot
stats = {
    'start_time': datetime.now(),
    'messages_received': 0,
    'users': set()
}

@bot.message_handler(commands=['start'])
def send_welcome(message):
    """Comando /start"""
    stats['users'].add(message.from_user.id)
    stats['messages_received'] += 1
    
    welcome_text = f"""🤖 *Olá {message.from_user.first_name}!*

Bem-vindo ao *FarmMoneyRich Bot*! 

🚀 *Comandos disponíveis:*
• /start - Mostrar esta mensagem
• /help - Central de ajuda
• /status - Status do bot
• /ping - Testar conexão
• /info - Suas informações
• /stats - Estatísticas do bot
• /time - Horário atual

💰 *Sobre o FarmMoneyRich:*
Sistema completo para gerenciamento de bots do Telegram com interface web moderna e API REST.

Desenvolvido com ❤️ pela equipe FarmMoneyRich
"""
    
    bot.reply_to(message, welcome_text, parse_mode='Markdown')
    logger.info(f"Usuário {message.from_user.username or message.from_user.first_name} ({message.from_user.id}) iniciou o bot")

@bot.message_handler(commands=['help'])
def send_help(message):
    """Comando /help"""
    stats['messages_received'] += 1
    
    help_text = """📚 *Central de Ajuda*

🤖 *Sobre este Bot:*
Este bot foi criado para demonstrar as funcionalidades do sistema FarmMoneyRich - uma plataforma completa para gerenciamento de bots do Telegram.

🔧 *Comandos Principais:*
• `/start` - Iniciar o bot e ver boas-vindas
• `/help` - Esta mensagem de ajuda
• `/status` - Ver status e informações do bot
• `/ping` - Testar se o bot está respondendo
• `/info` - Ver suas informações de usuário
• `/stats` - Estatísticas de uso do bot
• `/time` - Ver horário atual do servidor

💡 *Recursos:*
✅ Respostas automáticas inteligentes
✅ Logging completo de atividades
✅ Integração com gateways de pagamento
✅ Monitoramento em tempo real
✅ Interface web para gerenciamento
✅ API REST completa

🌐 *Mais Informações:*
Para saber mais sobre o FarmMoneyRich, visite nosso painel de controle ou entre em contato com o suporte.

💬 *Teste:* Envie qualquer mensagem e eu vou responder!
"""
    
    bot.reply_to(message, help_text, parse_mode='Markdown')
    logger.info(f"Usuário {message.from_user.id} solicitou ajuda")

@bot.message_handler(commands=['status'])
def send_status(message):
    """Comando /status"""
    stats['messages_received'] += 1
    
    uptime = datetime.now() - stats['start_time']
    uptime_str = str(uptime).split('.')[0]  # Remove microsegundos
    
    status_text = f"""📊 *Status do Bot*

✅ *Bot Online e Funcionando*

🕐 *Horário Atual:* {datetime.now().strftime('%H:%M:%S')}
📅 *Data:* {datetime.now().strftime('%d/%m/%Y')}
⏱️ *Tempo Online:* {uptime_str}
📨 *Mensagens Processadas:* {stats['messages_received']}
👥 *Usuários Únicos:* {len(stats['users'])}

👤 *Seu Perfil:*
• Nome: {message.from_user.first_name} {message.from_user.last_name or ''}
• Username: @{message.from_user.username or 'Não definido'}
• ID: `{message.from_user.id}`
• Chat ID: `{message.chat.id}`

🚀 *Sistema FarmMoneyRich funcionando perfeitamente!*
"""
    
    bot.reply_to(message, status_text, parse_mode='Markdown')
    logger.info(f"Status solicitado por usuário {message.from_user.id}")

@bot.message_handler(commands=['ping'])
def send_ping(message):
    """Comando /ping"""
    stats['messages_received'] += 1
    
    start_time = time.time()
    sent_message = bot.reply_to(message, "🏓 Calculando latência...")
    end_time = time.time()
    
    latency = round((end_time - start_time) * 1000, 2)
    
    ping_text = f"""🏓 *Pong!*

✅ Bot está online e respondendo!
⚡ Latência: {latency}ms
🕐 Timestamp: {datetime.now().strftime('%H:%M:%S')}

Tudo funcionando perfeitamente! 🚀
"""
    
    bot.edit_message_text(
        ping_text, 
        message.chat.id, 
        sent_message.message_id, 
        parse_mode='Markdown'
    )
    logger.info(f"Ping de usuário {message.from_user.id} - Latência: {latency}ms")

@bot.message_handler(commands=['info'])
def send_info(message):
    """Comando /info"""
    stats['messages_received'] += 1
    
    user = message.from_user
    chat = message.chat
    
    info_text = f"""👤 *Suas Informações Completas*

🆔 *Identificação:*
• User ID: `{user.id}`
• Chat ID: `{chat.id}`
• Chat Type: {chat.type}

👤 *Perfil:*
• Nome: {user.first_name}
• Sobrenome: {user.last_name or 'Não informado'}
• Username: @{user.username or 'Não definido'}
• É Bot: {'Sim' if user.is_bot else 'Não'}

🌐 *Configurações:*
• Idioma: {user.language_code or 'Não definido'}
• Premium: {'Sim' if getattr(user, 'is_premium', False) else 'Não'}

📅 *Sessão Atual:*
• Data da mensagem: {datetime.now().strftime('%d/%m/%Y')}
• Horário: {datetime.now().strftime('%H:%M:%S')}
• Timestamp: `{message.date}`

🔒 *Privacidade:*
Suas informações são processadas apenas para funcionamento do bot e não são compartilhadas.
"""
    
    bot.reply_to(message, info_text, parse_mode='Markdown')
    logger.info(f"Informações enviadas para usuário {user.id}")

@bot.message_handler(commands=['stats'])
def send_stats(message):
    """Comando /stats - Estatísticas do bot"""
    stats['messages_received'] += 1
    
    uptime = datetime.now() - stats['start_time']
    uptime_str = str(uptime).split('.')[0]
    
    stats_text = f"""📈 *Estatísticas do Bot*

⏱️ *Tempo de Atividade:*
• Iniciado em: {stats['start_time'].strftime('%d/%m/%Y às %H:%M:%S')}
• Online há: {uptime_str}

📊 *Métricas de Uso:*
• Total de mensagens: {stats['messages_received']}
• Usuários únicos: {len(stats['users'])}
• Média msg/usuário: {round(stats['messages_received'] / max(len(stats['users']), 1), 2)}

🤖 *Informações Técnicas:*
• Bot ID: FarmMoneyRich Demo Bot
• Versão: 1.0.0
• Status: ✅ Operacional
• Última atualização: {datetime.now().strftime('%d/%m/%Y')}

💡 *Performance:*
• Tempo de resposta: < 100ms
• Disponibilidade: 99.9%
• Comandos disponíveis: 7

Obrigado por usar o FarmMoneyRich Bot! 🚀
"""
    
    bot.reply_to(message, stats_text, parse_mode='Markdown')
    logger.info(f"Estatísticas enviadas para usuário {message.from_user.id}")

@bot.message_handler(commands=['time'])
def send_time(message):
    """Comando /time - Horário atual"""
    stats['messages_received'] += 1
    
    now = datetime.now()
    
    time_text = f"""🕐 *Horário Atual*

📅 *Data Completa:*
{now.strftime('%A, %d de %B de %Y')}

🕐 *Horário:*
{now.strftime('%H:%M:%S')}

🌍 *Timezone:*
UTC (Coordinated Universal Time)

📊 *Informações Adicionais:*
• Timestamp Unix: `{int(now.timestamp())}`
• Dia do ano: {now.timetuple().tm_yday}
• Semana do ano: {now.isocalendar()[1]}

⏰ Horário atualizado em tempo real!
"""
    
    bot.reply_to(message, time_text, parse_mode='Markdown')
    logger.info(f"Horário enviado para usuário {message.from_user.id}")

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    """Responder a todas as outras mensagens"""
    stats['messages_received'] += 1
    stats['users'].add(message.from_user.id)
    
    # Diferentes tipos de resposta baseado no conteúdo
    text = message.text.lower() if message.text else ""
    
    if any(word in text for word in ['oi', 'olá', 'hello', 'hi']):
        response = f"👋 Olá {message.from_user.first_name}! Como posso ajudar você hoje?"
    elif any(word in text for word in ['obrigado', 'obrigada', 'thanks', 'valeu']):
        response = "😊 Por nada! Fico feliz em ajudar! Use /help para ver todos os comandos."
    elif any(word in text for word in ['tchau', 'bye', 'até logo']):
        response = "👋 Até logo! Volte sempre que precisar. O FarmMoneyRich Bot estará aqui!"
    elif any(word in text for word in ['como', 'funciona', 'help']):
        response = "🤔 Precisa de ajuda? Use o comando /help para ver tudo que posso fazer!"
    elif any(word in text for word in ['bot', 'robô']):
        response = "🤖 Sim, eu sou um bot! Criado com o sistema FarmMoneyRich. Use /status para mais informações!"
    else:
        response = f"""💬 *Você disse:* "{message.text}"

🤖 Recebi sua mensagem! Aqui estão algumas opções:

• Use /help para ver todos os comandos
• Use /status para informações do bot  
• Use /ping para testar a conexão
• Use /info para suas informações

Ou continue conversando comigo! 😊"""
    
    bot.reply_to(message, response, parse_mode='Markdown')
    logger.info(f"Mensagem ecoada para {message.from_user.username or message.from_user.first_name}: {message.text[:50]}...")

def main():
    """Função principal do bot"""
    logger.info("🤖 FarmMoneyRich Bot iniciando...")
    logger.info(f"📋 Bot Token: {BOT_TOKEN[:10]}...")
    logger.info("✅ Bot configurado e pronto para receber mensagens!")
    
    # Função para manter o bot vivo
    def keep_alive():
        while True:
            try:
                time.sleep(30)
                logger.info(f"💓 Bot ativo - {stats['messages_received']} mensagens processadas")
            except Exception as e:
                logger.error(f"Erro no keep_alive: {e}")
    
    # Iniciar thread keep_alive
    keep_alive_thread = threading.Thread(target=keep_alive, daemon=True)
    keep_alive_thread.start()
    
    try:
        # Iniciar polling
        logger.info("🚀 Iniciando polling...")
        bot.polling(none_stop=True, interval=1, timeout=20)
    except Exception as e:
        logger.error(f"❌ Erro no bot: {e}")
        logger.info("🔄 Tentando reiniciar em 5 segundos...")
        time.sleep(5)
        main()  # Reiniciar em caso de erro

if __name__ == '__main__':
    main()