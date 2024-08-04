const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

require('dotenv').config();

const PRIVATE_CHAT_ID = process.env.PRIVATE_CHAT_ID;
const MY_CHAT_ID = process.env.MY_CHAT_ID;

// Function to transcribe audio using Whisper
async function transcribeWithWhisper(audioFilePath) {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(audioFilePath); // Audio Output Path
        const transcriptPath = audioFilePath.replace('.ogg', '.txt'); // TXT Output path

        // Execute Whisper with specific output directory
        exec(`whisper "${audioFilePath}" --language pt --output_format txt --output_dir "${outputDir}"`, (error, stdout, stderr) => {
            if (error) {
                reject(`Erro na transcrição: ${error.message}`);
            } else {
                // Check if transcribed file was created
                if (fs.existsSync(transcriptPath)) {
                    const transcription = fs.readFileSync(transcriptPath, 'utf-8');
                    resolve(transcription);
                } else {
                    // List all files in "temp" directory for verification
                    const files = fs.readdirSync(outputDir);
                    console.error("Arquivos encontrados no diretório temp:", files);

                    reject(`Erro: O arquivo ${transcriptPath} não foi encontrado.`);
                }
            }
        });
    });
}

// Function to transcribe audio
async function transcribeAudio(client, originalMessage, quotedMessage) {
    const tempDir = path.resolve(__dirname, 'temp');

    // Checks if 'temp' directory exists, if not, create it
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const media = await quotedMessage.downloadMedia();
    if (media) {
        const audioFileName = `${quotedMessage.id._serialized}.ogg`;
        const audioFilePath = path.resolve(tempDir, audioFileName);

        // Saves audio files temporarily
        fs.writeFileSync(audioFilePath, media.data, { encoding: 'base64' });

        try {
            // Audio transcription using Whisper
            const transcription = await transcribeWithWhisper(audioFilePath);
            const chatId = quotedMessage.from;
            const grupoId = PRIVATE_CHAT_ID;

            // Reply to user's message with transcription
            await quotedMessage.reply(`_*Transcrição de Áudio Automática*_\n\n${transcription}`);
            await originalMessage.react('✅');

            // Send notification to myself due to Bot reading the mesage and not allowing WhatsApp device to notify
            // Notification is only sent if audio was not sent by myself

            if (chatId !== MY_CHAT_ID){
                await client.sendMessage(grupoId, `*O Estagiário realizou uma transcrição do contato ${quotedMessage.author}*\nSolicitada por ${originalMessage.author}`);
                // Mark message/group as unread
                const chat = await client.getChatById(chatId);
                await chat.markUnread();
            }

            
        } catch (error) {
            console.error(error);
        }
    } else {
        console.error("Falha ao baixar a mídia.");
    }
}

// Export function to be used in other files
module.exports = { transcribeAudio };

