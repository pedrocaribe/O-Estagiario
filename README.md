# O Mensageiro

O Mensageiro is a Node.js-based automation bot designed to assist with university tasks and WhatsApp management. The bot automates the process of downloading new study materials from a university portal, organizes them in Google Drive, and sends notifications and files to a designated WhatsApp group. Additionally, the bot transcribes voice messages received in WhatsApp chats using the Whisper transcription service, automatically replying with the transcription and sending notifications to the bot owner.

## Features

- **Automated University Portal Scraping:** Logs into the university portal, downloads new study materials, and organizes them in Google Drive.
- **WhatsApp Integration:** Sends notifications and files to a specified WhatsApp group when new materials are posted.
- **Voice Message Transcription:** Automatically transcribes voice messages received on WhatsApp and replies with the text.
- **Persistent WhatsApp Session:** The bot maintains a persistent session, avoiding the need to scan the QR code each time it is run.
- **Custom Notifications:** Sends a notification to the bot owner when a transcription is completed and optionally marks the chat as unread.

## Installation

Clone this repository to your local machine:

```bash
git clone git@github.com:yourusername/O-Mensageiro.git
cd O-Mensageiro
Install the required dependencies:
```

```bash
npm install
Environment Variables
Create a .env file in the root of the project and add the following environment variables:
```

```bash
CLIENT_ID=your_client_id
PRIVATE_CHAT_ID=your_private_chat_id
MY_CHAT_ID=your_chat_id
UNISANTA_URL=https://portaleducacional.unisanta.br/FrameHTML/web/app/edu/PortalEducacional/login/
USER_RA=your_registration_number
USER_PASS=your_password
GOOGLE_DRIVE_FOLDER=/path/to/your/google/drive/folder
```

## Usage
Start the bot with:

```bash
node index.js
```

## Contributing
If you want to contribute to this project, feel free to fork the repository and submit a pull request.

## License
This project is licensed under the MIT License.     
