const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

require('dotenv').config();

const PRIVATE_CHAT_ID = process.env.PRIVATE_CHAT_ID;
const UNISANTA_URL = process.env.UNISANTA_URL;
const USER_RA = process.env.USER_RA;
const USER_PASS = process.env.USER_PASS;
const MY_FOLDER = process.env.MY_FOLDER;

// Function to send WhatsApp message
async function sendWhatsAppMessage(client, subjectName, fileName, filePath) {
    const chatId = PRIVATE_CHAT_ID;
    const message = `_*Novo arquivo postado*_ \n\n*${subjectName}*\n\n${fileName}`;
    await client.sendMessage(chatId, message);

    // Send file as a Document
    const media = MessageMedia.fromFilePath(filePath);

    // Added try/catch to avoid issues
    try {
        await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
    }
    catch (error) {
        console.log('Falha ao enviar mensagem', error);
    }
}

// Function to check if there are new files in University portal
async function checkForNewMaterials(client) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

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
                const downloadDir = path.resolve(MY_FOLDER, courseName);
                const filePath = path.resolve(downloadDir, `${material.fileName}.${material.fileExtension}`);

                // Checks for folder path existence, if not, create it
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }

                // Checks for duplicate files
                if (!fs.existsSync(filePath)) {
                    try {
                        console.log(`Baixando ${material.fileName}.${material.fileExtension}`);
                        
                        // Create CDP to set download location
                        const pageCDP = await page.target().createCDPSession();
                        await pageCDP.send('Page.setDownloadBehavior', {
                            behavior: 'allow',
                            downloadPath: downloadDir,
                        });

                        // Use same tab to navigate to download tab
                        await page.evaluate((link) => {
                            location.href = link;
                        }, material.url);

                        // Check for download completion
                        let downloadStarted = false;
                        while (!downloadStarted) {
                            downloadStarted = fs.existsSync(filePath);
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

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

// Export function to be used in other files
module.exports = { checkForNewMaterials };
