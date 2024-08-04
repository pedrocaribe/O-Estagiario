const { Client, LocalAuth } = require('whatsapp-web.js');
const { transcribeAudio } = require('./comandos');
const { checkForNewMaterials } = require('./universidade');
const qrcode = require('qrcode-terminal');

require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

// Implementation of decorators for commands
const commands = {};

function registerCommand(command, callback) {
    commands[command] = callback;
}

// Initialize WhatsApp client with local authentication
const client = new Client({
    authStrategy: new LocalAuth({ clientId: `${CLIENT_ID}` }),
    puppeteer: { headless: true }
});

// Show QR Code for WhatsApp login if needed
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR Code acima para logar no WhatsApp.');
});

// When WhatsApp client is ready
client.on('ready', async () => {
    console.log('Estagiário está pronto para trabalhar!');

    // Begin new courseware verification every 60 seconds 
    setInterval(() => {
        checkForNewMaterials(client);
    }, 60000);
});

// Listen for ALL received messages 
client.on('message_create', async (message) => {
    const args = message.body.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commands[commandName]) {
        try {
            await commands[commandName](message, args);
        } catch (error) {
            console.error(`Erro ao executar comando ${commandName}:`, error);
        }
    }
});

// Register the '!transcrever' command manually
registerCommand('!transcrever', async (message, args) => {
    if (!message.hasQuotedMsg) {
        return await message.reply("Você tem que responder ao *áudio* com o comando _*!transcrever*_");
    }

    const quotedMessage = await message.getQuotedMessage();

    if (['ptt', 'audio'].includes(quotedMessage.type)) {
        message.react('⌛');
        return await transcribeAudio(client, message, quotedMessage);
    } 

    return await message.reply(`Essa não é uma mensagem de *áudio*.`);
});

// Initialize WhatsApp client
client.initialize();
