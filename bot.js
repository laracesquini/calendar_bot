const TelegramBot = require('node-telegram-bot-api');
const token = '8431421983:AAFZtWrCldaPFOt7QWuXIzI8va4rdyWEtnw';

console.log("Iniciando bot...");

const bot = new TelegramBot(token, { polling: true });
const commands = [
  "/start - Iniciar",
  "/comandos - Ver comandos",
  "/formatar_documento_vscode - Formatar documento no VsCode"
]

bot.on("polling_error", (error) => {
  console.log(error);
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Olá, Lara! O que você quer saber hoje?")
})

bot.onText(/\/formatar_documento_vscode/, (msg) => {
  bot.sendMessage(msg.chat.id, "Shift+Alt+F")
})

bot.onText(/\/comandos/, (msg) => {
  bot.sendMessage(msg.chat.id, `
Comandos disponíveis:
${commands.join("\n")}
  `);
});

bot.on('message', (msg) => {
  console.log(msg.chat.id);
});


