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

// Function to send WhatsApp message
async function sendWhatsAppMessage(client, subjectName, fileName, filePath) {
    const chatId = PRIVATE_CHAT_ID;
    const message = `Novo arquivo postado para ${subjectName}: ${fileName}`;
    await client.sendMessage(chatId, message);

    // Send file as a Document
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
}

// Function to check if there are new files in University portal
async function checkForNewMaterials(client) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Configure axios instance to ignore invalid SSL certificates
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    try {
        // Access University login page
        await page.goto(UNISANTA_URL, { waitUntil: 'networkidle2' });

        // Disable all animations in order to process information faster
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

        // Fill Login form
        await page.type('#User', USER_RA); // Insira seu RA
        await page.type('#Pass', USER_PASS); // Insira sua senha

        // Send Login form
        await page.click('input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

        // Click on "Confirmar" button
        await page.waitForSelector('#btnConfirmar', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 300)); // Timeout needed before clicking
        await page.click('#btnConfirmar');

        // Wait until "Material Didatico" button is available and click on it
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
        await page.waitForSelector('a[href="/Academico/MaterialDidatico"]', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 500)); // Timeout needed before clicking
        await page.click('a[href="/Academico/MaterialDidatico"]');

        // List all courses
        const courses = await page.$$('.disciplinasMaterialDidatico');
        console.log(`Encontradas ${courses.length} disciplinas.`);

        // Iterate through all courses and check for new files posted by Professors
        for (let i = 0; i < courses.length; i++) {
            const courses = await page.$$('.disciplinasMaterialDidatico'); // Needed due to dynamic changing of elements
            const course = courses[i];
            const courseName = await page.evaluate(el => el.innerText.trim().toUpperCase(), course);

            await new Promise(resolve => setTimeout(resolve, 500)); // Timeout needed before clicking
            console.log(`Acessando disciplina ${i + 1}: ${courseName}`);
            await course.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

            // Fetch all files download links
            const courseware = await page.$$eval("td strong > a[href*='Download']", links => links.map(link => ({
                url: link.href,
                fileName: link.href.split('NomeDoArquivoOriginal=')[1].split("&")[0],
                fileExtension: link.href.split('Extensao=')[1].split("&")[0],
            })));

            console.log(`Encontrados ${courseware.length} materiais para Download.`);

            // Iterate through all files and checks for duplicate, saves to Google Drive and Send as WhatsApp message
            for (let material of courseware) {
                const downloadDir = path.resolve(GOOGLE_DRIVE_FOLDER, courseName);
                const filePath = path.resolve(downloadDir, `${material.fileName}.${material.fileExtension}`);

                // Checks for folder path existence, if not, create it
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }

                // Checks for duplicate files
                if (!fs.existsSync(filePath)) {
                    try {
                        console.log(`Baixando ${material.fileName}.${material.fileExtension}`);
                        const response = await axiosInstance.get(material.url, { responseType: 'arraybuffer' });
                        fs.writeFileSync(filePath, response.data);
                        console.log(`Download de ${material.fileName}.${material.fileExtension} concluído.`);

                        // Send WhatsApp message after Download
                        await sendWhatsAppMessage(client, courseName, `${material.fileName}.${material.fileExtension}`, filePath);
                    } catch (error) {
                        console.log(`Erro ao baixar ${material.fileName}.${material.fileExtension}:`, error);
                    }
                } else {
                    console.log(`Arquivo ${material.fileName}.${material.fileExtension} já foi baixado.`);
                }
            }

            // Back to course list to iterate through next course.
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
