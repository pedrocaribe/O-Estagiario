const { Client, LocalAuth } = require('whatsapp-web.js');
const { transcribeAudio } = require('./comandos');
const { checkForNewMaterials } = require('./universidade');
const qrcode = require('qrcode-terminal');

require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

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
    if (message.type == 'ptt'){
        transcribeAudio(client, message);
    }
});

// Initialize WhatsApp client
client.initialize();