const { Client, LocalAuth } = require('whatsapp-web.js');
const { transcribeAudio } = require('./transcription');
const { checkForNewMaterials } = require('./universidade');
const qrcode = require('qrcode-terminal');

require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

// Implementation of decorators for commands
const commands = [];

// Character used to issue commands
const commandPrefix = '!';
const REFRESH_INTERVAL = 3e6;

class Command {
    constructor(name, aliases=[], description='', callback) {
        this.name = name;
        this.aliases = aliases;
        this.description = description;
        this.callback = callback;
    }
}

// Register command and/or aliases
function registerCommand(name, aliases=[], description='', callback) {
    const newCommand = new Command(name=name, aliases=aliases, description=description, callback=callback)
    if (aliases) {
        newCommand.aliases = aliases;
    }
    if (description) {
        newCommand.description = description;
    }
    commands.push(newCommand);
}

// Added loop function to handle interval better, without risking new window to be opened in parallel
async function executeInLoop(client) {
    while(true) {
        await checkForNewMaterials(client);
        await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
    }
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
    executeInLoop(client);
});

// Listen for ALL received messages 
client.on('message_create', async (message) => {

    if(message.body.startsWith(commandPrefix)){
        const args = message.body.trim().split(/ +/);
        const commandName = args[0].split(commandPrefix).pop();

        const foundCommand = commands.find(command => command.name == commandName || command.aliases.includes(commandName));

        if (!foundCommand) {
            return await message.reply('Comando não encontrado!')
        }

        try {
            await foundCommand.callback(message, args);
        } catch (error) {
                console.error(`Erro ao executar comando ${commandName}:`, error);
        }
    }
});

registerCommand(
    name='transcrever', 
    aliases=['tc', 'transc'], 
    description='Transcreve um áudio ou mensagem de voz. Uso: Responda a mensagem contendo o áudio inserindo o comando',
    callback= async (message, args) => {
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

registerCommand(
    name='help', 
    aliases=['ajuda'],
    description='Exibe todos os comandos disponíveis e suas descrições.',
    callback= async (message, args) => {
        let helpMessage = '📜 *Lista de Comandos Disponíveis:*\n\n';

        commands.forEach(command => {
            // Command name
            helpMessage += `*${commandPrefix}${command.name}*\n`;
            
            // Add aliases, if existant
            if (command.aliases.length > 0) {
                helpMessage += `_Aliases:_ ${command.aliases.map(alias => `${commandPrefix}${alias}`).join(', ')}\n`;
            }
            
            // Add description, if existant
            if (command.description) {
                helpMessage += `_Descrição:_ ${command.description}\n`;
            }

            // Separate commands
            helpMessage += '\n';
        });

        await message.reply(helpMessage);
    });


// Initialize WhatsApp client
client.initialize();
