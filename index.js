const { Client, LocalAuth } = require('whatsapp-web.js');
const { transcreverAudio } = require('./comandos');
const { checkForNewMaterials } = require('./universidade');
const qrcode = require('qrcode-terminal');

require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

// Inicializa o cliente WhatsApp com autenticação local
const client = new Client({
    authStrategy: new LocalAuth({ clientId: `${CLIENT_ID}` }),
    puppeteer: { headless: true }
});

// Exibe o QR code para login no WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR Code acima para logar no WhatsApp.');
});

// Quando o cliente WhatsApp estiver pronto
client.on('ready', async () => {
    console.log('Estagiário está pronto para trabalhar!');
    
    // Inicia a verificação periódica de novos materiais a cada 60 segundos
    setInterval(() => {
        checkForNewMaterials(client);
    }, 60000); // 60000 milissegundos = 60 segundos
});

// Escuta por mensagens recebidas
client.on('message_create', async (message) => {
    if (message.type == 'ptt'){
        transcreverAudio(client, message);
    }
});

client.initialize();



// const { Client, LocalAuth } = require('whatsapp-web.js');
// const { transcreverAudio } = require('./comandos');
// const { checkForNewMaterials } = require('./universidade');
// const qrcode = require('qrcode-terminal');

// require('dotenv').config();

// const CLIENT_ID = process.env.CLIENT_ID;

// // Inicializa o cliente WhatsApp com autenticação local
// const client = new Client({
//     authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
//     puppeteer: { headless: true },
//     // Garante que mensagens próprias também sejam capturadas
//     takeoverOnConflict: true,
//     takeoverTimeoutMs: 0,
// });

// // Exibe o QR code para login no WhatsApp
// client.on('qr', qr => {
//     qrcode.generate(qr, { small: true });
//     console.log('Escaneie o QR Code acima para logar no WhatsApp.');
// });

// // Quando o cliente WhatsApp estiver pronto
// client.on('ready', () => {
//     console.log('Estagiário está pronto para trabalhar!');
// });

// // Escuta por mensagens recebidas
// client.on('message', async message => {
//     console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
//     if (message.fromMe) {
//         console.log('Esta mensagem foi enviada por você.');
//     } else {
//         console.log('Esta mensagem foi enviada por outra pessoa.');
//     }
// });

// client.on('message_create', async (msg) => {
//     console.log(`Mensagem recebida de ${msg.from}: ${msg.body}}`);
// });

// client.initialize();
