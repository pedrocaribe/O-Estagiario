const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

require('dotenv').config();

const PRIVATE_CHAT_ID = process.env.PRIVATE_CHAT_ID;
const MY_CHAT_ID = process.env.MY_CHAT_ID;

// Função para transcrever o áudio com Whisper
async function transcreverComWhisper(audioFilePath) {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(audioFilePath); // Diretório de saída
        const transcriptPath = audioFilePath.replace('.ogg', '.txt'); // Caminho esperado do arquivo .txt

        // Comando Whisper com diretório de saída específico
        exec(`whisper "${audioFilePath}" --language pt --output_format txt --output_dir "${outputDir}"`, (error, stdout, stderr) => {
            if (error) {
                reject(`Erro na transcrição: ${error.message}`);
            } else {
                // Verificar se o arquivo transcrito foi criado
                if (fs.existsSync(transcriptPath)) {
                    const transcricao = fs.readFileSync(transcriptPath, 'utf-8');
                    resolve(transcricao);
                } else {
                    // Listar arquivos no diretório temp para depuração
                    const files = fs.readdirSync(outputDir);
                    console.error("Arquivos encontrados no diretório temp:", files);

                    reject(`Erro: O arquivo ${transcriptPath} não foi encontrado.`);
                }
            }
        });
    });
}

// Função para transcrever o áudio
async function transcreverAudio(client, message) {
    const tempDir = path.resolve(__dirname, 'temp');

    // Verifica se o diretório 'temp' existe, caso contrário, cria-o
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const media = await message.downloadMedia();
    if (media) {
        const audioFileName = `${message.id._serialized}.ogg`;
        const audioFilePath = path.resolve(tempDir, audioFileName);

        // Salva o arquivo de áudio temporariamente
        fs.writeFileSync(audioFilePath, media.data, { encoding: 'base64' });

        try {
            // Transcrição do áudio usando Whisper
            const transcricao = await transcreverComWhisper(audioFilePath);
            const chatId = message.from;
            const grupoId = PRIVATE_CHAT_ID;

            // Responde à mensagem com a transcrição
            await message.reply(`_*Transcrição de Áudio Automática*_\n${transcricao}`);

            // Envia notificação para mim mesmo
            if (chatId !== MY_CHAT_ID){
                await client.sendMessage(grupoId, `*O Estagiário realizou uma transcrição do contato ${message.author}*`);
                // Marcar chat como não lido
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

module.exports = { transcreverAudio };

