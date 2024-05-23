const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

async function promptUser() {
    const questions = [
        {
            type: 'confirm',
            name: 'useTypeScript',
            message: 'Would you like to use TypeScript (recommended)?',
            default: true,
        },
        {
            type: 'confirm',
            name: 'useDotenv',
            message: 'Would you like to include dotenv for environment variables?',
            default: true
        },
        {
            type: 'list',
            name: 'database',
            message: 'Which database library would you like to use?',
            choices: ['None', 'Sequelize (SQL Server only)'],
            default: 'None'
        },
        {
            type: 'confirm',
            name: 'initializeGit',
            message: 'Would you like to initialize a Git repository?',
            default: true
        }
    ];

    return inquirer.prompt(questions);
}

function createFolderStructure(root, config) {
    const folders = [
        'src',
        'src/routes',
        'src/controllers',
        'src/models',
        'src/services',
        'src/middlewares',
        'src/db'
    ];

    const extension = config.useTypeScript ? 'ts' : 'js';

    const files = [
        {
            path: `src/app.${extension}`,
            content: getIndexFileContent(config)
        },
        {
            path: `src/routes/index.${extension}`,
            content: `import express from 'express';\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n    res.send('Hello, world!');\n});\n\nexport default router;`
        }
    ];

    if (config.useDotenv) {
        files.push({
            path: '.env',
            content: getEnvContent()
        });
    }

    if (config.database === 'Sequelize (SQL Server only)') {
        files.push({
            path: `src/db/config.${extension}`,
            content: getSequelizeConfigContent(config)
        });
    }

    if (config.useTypeScript) {
        files.push({
            path: 'tsconfig.json',
            content: getTsConfigContent()
        });
    }

    if (config.initializeGit){
        files.push({
            path: '.gitignore',
            content: getGitignoreContent()
        });
    }

    folders.forEach(folder => {
        const dir = path.join(root, folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    files.forEach(file => {
        const filePath = path.join(root, file.path);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.content);
        }
    }); 
    
    createPackageJson(root, config);
    installDependencies(root, config);

    if (config.initializeGit) {
        initializeGit(root);
    }

    printInstructions(root);
}

function getIndexFileContent(config) {
    const useTypeScript = config.useTypeScript;
    const dotenvImport = config.useDotenv ? (useTypeScript ? "import dotenv from 'dotenv';\ndotenv.config();" : "require('dotenv').config();") : '';
    return  `
${dotenvImport}
${useTypeScript ? "import express from 'express';" : "const express = require('express');"}
${useTypeScript ? "import router from './routes';" : "const router = require('./routes');"}

const app = express();

app.use(express.json());
app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`🚀 Server is running on http://localhost:\${PORT}\`);
});
`;
}

function getEnvContent() {
    return `
PORT=3000 
SQL_SERVER_HOST=localhost
SQL_SERVER_DATABASE=mydatabase
SQL_SERVER_USER=sa
SQL_SERVER_PASSWORD=password 
SQL_SERVER_INSTANCE=SQLEXPRESS
`; 
}

function getSequelizeConfigContent(config) {
    const useTypeScript = config.useTypeScript;
    const dotenvImport = config.useDotenv ? (useTypeScript ? "import dotenv from 'dotenv';\ndotenv.config();" : "require('dotenv').config();") : '';
    return ` ${dotenvImport}
${useTypeScript ? "import { Sequelize } from 'sequelize';" : "const { Sequelize } = require('sequelize');"}

const DATABASE_NAME = process.env.SQL_SERVER_DATABASE ?? '';
const DATABASE_USER = process.env.SQL_SERVER_USER ?? '';
const DATABASE_PASSWORD = process.env.SQL_SERVER_PASSWORD ?? '';
const DATABASE_HOST = process.env.SQL_SERVER_HOST ?? '';
const DATABASE_INSTANCE = process.env.SQL_SERVER_INSTANCE ?? '';

const sequelize = new Sequelize(DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, {
    host: DATABASE_HOST,
    dialect: 'mssql',
    dialectOptions: {
        options: {
            encrypt: true,
            instancename: DATABASE_INSTANCE
        }
    },
    logging: false
});

sequelize.sync();

sequelize.authenticate()
.then(() => {
    console.log('🔌Connection to database has been established successfully');
})
.catch((error) => {
    console.error('Unable to connect to the database:', error);
});

export { sequelize };
`
}

function createPackageJson(root, config) {
    const extension = config.useTypeScript ? 'ts' : 'js';
    const packageJsonPath = path.join(root, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        const packageJsonContent = {
            name: path.basename(root),
            version: "1.0.0",
            main: `src/app.${extension}`,
            scripts: {
                start: `node src/app.${extension}`,
                test: "echo \"Error: no test specified\" && exit 1"
            },
            keywords: [],
            author: "",
            license: "ISC",
        };

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    }
}

function installDependencies(root, config) {
    const dependencies = ['express'];
    const devDependencies = ['@types/express', '@types/node'];

    if (config.useDotenv) {
        dependencies.push('dotenv');
    }

    if (config.database === 'Sequelize (SQL Server only)') {
        dependencies.push('sequelize');
        dependencies.push('tedious');
        devDependencies.push('@types/sequelize');
    }

    if (config.useTypeScript) {
        devDependencies.push('typescript');
    }

    console.log('Installing dependencies...');
    execSync(`npm install ${dependencies.join(' ')}`, { cwd: root, stdio: 'inherit' });
    console.log('Installing Dev dependencies...');
    execSync(`npm install ${devDependencies.join(' ')} --save-dev`, { cwd: root, stdio: 'inherit' });
}

function initializeGit(root) {
    console.log('Initializing Git repository...');
    execSync('git init', { cwd: root, stdio: 'inherit' });
}

function getGitignoreContent() {
    return `
# dotenv environment variable files
.env 
.env.development.local
.env.test.local
.env.production.local
.env.local

# node_modules
node_modules

# build output
dist
`; 
}

function getTsConfigContent() {
    return `{ 
        "compilerOptions": 
            { 
                "target": "ES6", 
                "module": "CommonJS", 
                "outDir": "./dist", 
                "strict": true,  
                "esModuleInterop": true
            } 
        }`;
}

function printInstructions(root) {
    const projectName = path.basename(root);
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Project setup is complete! 🎉\n');
    console.log('Next steps:');
    console.log(`1. Navigate to your project folder:\n   \x1b[33mcd ${projectName}\x1b[0m`);
    console.log('2. Start your development server:');
    console.log('   \x1b[33mnpm start\x1b[0m');
    console.log('\nHappy coding!\n');
    console.log('=' .repeat(50));
}

module.exports = { promptUser, createFolderStructure };
