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

const commands = [
  "/start - Iniciar",
  "/comandos - Ver comandos",
  "/list - Listar lembretes",
  "/add - Adicionar lembrete (Formato: comando dia mensagem)",
  "/remove - Remover lembrete (Formato: comando index)",
]

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

bot.onText(/\/comandos/, (msg) => {
  bot.sendMessage(msg.chat.id, `
Comandos disponíveis:
${commands.join("\n")}
\n\nSite usado para rodar o bot: https://dashboard.render.com/\n
Site usado para fazer o get no serviço (a cada 1h) e impedir que ele durma: https://dashboard.uptimerobot.com/
  `);
});

// /add DIA HORA MENSAGEM
bot.onText(/\/add (\d{1,2}) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const dia = parseInt(match[1]);
  const mensagem = match[2];

  if (dia < 1 || dia > 31) {
    return bot.sendMessage(chatId, "❌ Dia inválido.");
  }

  const lembretes = lerLembretes();

  lembretes.push({ chatId, dia, mensagem });

  salvarLembretes(lembretes);

  bot.sendMessage(chatId, `✅ Lembrete criado para dia ${dia}!`);
});

// /list
bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const lembretes = lerLembretes().filter(l => l.chatId === chatId).sort((a, b) => a.dia - b.dia);

  if (!lembretes.length) {
    return bot.sendMessage(chatId, "Você não tem lembretes.");
  }

  let texto = "📅 Seus lembretes:\n\n";
  lembretes.forEach((l, i) => {
    texto += `${i + 1}. Dia ${l.dia} - ${l.mensagem}\n`;
  });

  bot.sendMessage(chatId, texto);
});

// /remove INDEX
bot.onText(/\/remove (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const index = parseInt(match[1]) - 1;

  const lembretes = lerLembretes();
  const meus = lembretes.filter(l => l.chatId === chatId).sort((a, b) => a.dia - b.dia);

  if (!meus[index]) {
    return bot.sendMessage(chatId, "❌ Lembrete inválido.");
  }

  const remover = meus[index];

  const novos = lembretes.filter(l =>
    !(l.chatId === chatId &&
      l.dia === remover.dia &&
      l.mensagem === remover.mensagem)
  );

  salvarLembretes(novos);

  bot.sendMessage(chatId, "🗑 Lembrete removido.");
});

function verificarLembretes() {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const dataHojeStr = hoje.toISOString().split("T")[0]; // YYYY-MM-DD

  const lembretes = lerLembretes();
  let alterado = false;

  lembretes.forEach(l => {
    if (l.dia === diaHoje) {

      if (l.ultimoEnvio !== dataHojeStr) {
        bot.sendMessage(l.chatId, `🔔 Lembrete: ${l.mensagem}`);
        l.ultimoEnvio = dataHojeStr;
        alterado = true;
      } else {
        console.log(`Esse lembrete já foi enviado hoje`);
      }
    }
  });

  if (alterado) {
    salvarLembretes(lembretes);
  }
}


/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  verificarLembretes();
  res.send("OK");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
