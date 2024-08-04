const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

require('dotenv').config();

const PRIVATE_CHAT_ID = process.env.PRIVATE_CHAT_ID;
const UNISANTA_URL = process.env.UNISANTA_URL;
const USER_RA = process.env.USER_RA;
const USER_PASS = process.env.USER_PASS;
const GOOGLE_DRIVE_FOLDER = process.env.GOOGLE_DRIVE_FOLDER;

// Função para enviar uma mensagem no WhatsApp
async function sendWhatsAppMessage(client, subjectName, fileName, filePath) {
    const chatId = PRIVATE_CHAT_ID; // Substitua pelo ID do grupo desejado
    const message = `Novo arquivo postado para ${subjectName}: ${fileName}`;
    await client.sendMessage(chatId, message);

    // Envia o arquivo como documento
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
}

// Função para verificar se há novos materiais
async function checkForNewMaterials(client) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Configura uma instância do axios para ignorar certificados SSL inválidos
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    try {
        // Acessa a página de login
        await page.goto(UNISANTA_URL, { waitUntil: 'networkidle2' });

        // Desabilita animações na página
        await page.evaluate(() => {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = `
                * {
                    transition: none !important;
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        });

        // Preenche o formulário de login
        await page.type('#User', USER_RA); // Insira seu RA
        await page.type('#Pass', USER_PASS); // Insira sua senha

        // Envia o formulário
        await page.click('input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

        // Interage com o botão "Confirmar"
        await page.waitForSelector('#btnConfirmar', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 300)); // Substituindo waitForTimeout
        await page.click('#btnConfirmar');

        // Espera até que o link de "Material Didático" esteja visível e clica nele
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
        await page.waitForSelector('a[href="/Academico/MaterialDidatico"]', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 500)); // Substituindo waitForTimeout
        await page.click('a[href="/Academico/MaterialDidatico"]');

        // Pega todas as disciplinas
        const disciplinas = await page.$$('.disciplinasMaterialDidatico');
        console.log(`Encontradas ${disciplinas.length} disciplinas.`);

        for (let i = 0; i < disciplinas.length; i++) {
            const disciplinas = await page.$$('.disciplinasMaterialDidatico');
            const disciplina = disciplinas[i];
            const disciplinaNome = await page.evaluate(el => el.innerText.trim().toUpperCase(), disciplina);

            await new Promise(resolve => setTimeout(resolve, 500)); // Substituindo waitForTimeout
            console.log(`Acessando disciplina ${i + 1}: ${disciplinaNome}`);
            await disciplina.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

            // Pega todos os links de materiais para download
            const materiais = await page.$$eval("td strong > a[href*='Download']", links => links.map(link => ({
                url: link.href,
                fileName: link.href.split('NomeDoArquivoOriginal=')[1].split("&")[0],
                fileExtension: link.href.split('Extensao=')[1].split("&")[0],
            })));

            console.log(`Encontrados ${materiais.length} materiais para Download.`);

            for (let material of materiais) {
                const downloadDir = path.resolve(GOOGLE_DRIVE_FOLDER, disciplinaNome);
                const filePath = path.resolve(downloadDir, `${material.fileName}.${material.fileExtension}`);

                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }

                if (!fs.existsSync(filePath)) {
                    try {
                        console.log(`Baixando ${material.fileName}.${material.fileExtension}`);
                        const response = await axiosInstance.get(material.url, { responseType: 'arraybuffer' });
                        fs.writeFileSync(filePath, response.data);
                        console.log(`Download de ${material.fileName}.${material.fileExtension} concluído.`);

                        // Envia a mensagem no WhatsApp após o download
                        await sendWhatsAppMessage(client, disciplinaNome, `${material.fileName}.${material.fileExtension}`, filePath);
                    } catch (error) {
                        console.log(`Erro ao baixar ${material.fileName}.${material.fileExtension}:`, error);
                    }
                } else {
                    console.log(`Arquivo ${material.fileName}.${material.fileExtension} já foi baixado.`);
                }
            }

            // Voltar para a lista de disciplinas
            await page.goBack({ waitUntil: 'networkidle2' });
        }

    } catch (error) {
        console.log('Erro durante a execução:', error);
        await page.screenshot({ path: 'error.png' });
    } finally {
        await browser.close();
    }
}

// Exporta a função para ser usada em outro lugar
module.exports = { checkForNewMaterials };
