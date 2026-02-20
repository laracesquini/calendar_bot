const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');

const token = process.env.TELEGRAM_TOKEN;
const url = process.env.RENDER_EXTERNAL_URL; // Render cria automaticamente

if (!token) {
  throw new Error("TELEGRAM_TOKEN não definido.");
}

const bot = new TelegramBot(token);
const app = express();

app.use(express.json());

/* =========================
   FUNÇÕES DE ARQUIVO
========================= */

function lerLembretes() {
  if (!fs.existsSync('lembretes.json')) return [];
  return JSON.parse(fs.readFileSync('lembretes.json'));
}

function salvarLembretes(lembretes) {
  fs.writeFileSync('lembretes.json', JSON.stringify(lembretes, null, 2));
}

/* =========================
   WEBHOOK
========================= */

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.setWebHook(`${url}/bot${token}`);

/* =========================
   COMANDOS
========================= */

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "📅 Bem-vinda à sua Agenda Mensal!");
});

// /add DIA HORA MENSAGEM
bot.onText(/\/add (\d{1,2}) (\d{1,2}) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const dia = parseInt(match[1]);
  const hora = parseInt(match[2]);
  const mensagem = match[3];

  if (dia < 1 || dia > 31 || hora < 0 || hora > 23) {
    return bot.sendMessage(chatId, "❌ Dia ou hora inválidos.");
  }

  const lembretes = lerLembretes();

  lembretes.push({ chatId, dia, hora, mensagem });

  salvarLembretes(lembretes);

  bot.sendMessage(chatId, `✅ Lembrete criado para dia ${dia} às ${hora}:00`);
});

// /list
bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const lembretes = lerLembretes().filter(l => l.chatId === chatId);

  if (!lembretes.length) {
    return bot.sendMessage(chatId, "Você não tem lembretes.");
  }

  let texto = "📅 Seus lembretes:\n\n";
  lembretes.forEach((l, i) => {
    texto += `${i + 1}. Dia ${l.dia} às ${l.hora}:00 - ${l.mensagem}\n`;
  });

  bot.sendMessage(chatId, texto);
});

// /remove INDEX
bot.onText(/\/remove (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const index = parseInt(match[1]) - 1;

  const lembretes = lerLembretes();
  const meus = lembretes.filter(l => l.chatId === chatId);

  if (!meus[index]) {
    return bot.sendMessage(chatId, "❌ Lembrete inválido.");
  }

  const remover = meus[index];

  const novos = lembretes.filter(l =>
    !(l.chatId === chatId &&
      l.dia === remover.dia &&
      l.hora === remover.hora &&
      l.mensagem === remover.mensagem)
  );

  salvarLembretes(novos);

  bot.sendMessage(chatId, "🗑 Lembrete removido.");
});

/* =========================
   CRON - VERIFICA A CADA MINUTO
========================= */

cron.schedule('* * * * *', () => {
  const agora = new Date();
  const dia = agora.getDate();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();

  if (minuto !== 0) return;

  const lembretes = lerLembretes();

  lembretes.forEach(l => {
    if (l.dia === dia && l.hora === hora) {
      bot.sendMessage(l.chatId, `🔔 Lembrete: ${l.mensagem}`);
    }
  });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot está rodando 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
