#!/usr/bin/env node

const path = require('path');
const { promptUser, createFolderStructure } = require('../lib');

async function main() {
    const projectName = process.argv[2];
    if (!projectName) {
        console.error('Error: Project name is required.');
        console.log('Usage: generate-api <project-name>');
        process.exit(1);
    }
    
    const config = await promptUser();
    const root = path.resolve(process.cwd(), projectName);
    createFolderStructure(root, config);
}

main();
