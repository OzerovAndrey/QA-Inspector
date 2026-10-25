const fs = require('node:fs');
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.QA_CHROME_PATH || (fs.existsSync(macChrome) ? macChrome : undefined);
module.exports = executablePath ? { executablePath } : {};
