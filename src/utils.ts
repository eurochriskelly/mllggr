import { resolve } from 'path';
import { promisify } from 'util';
import { freshLogFile } from './eval-strings';
import { mkdir, appendFile, writeFileSync, existsSync } from 'fs';

const appendFileAsync = promisify(appendFile);
export const mkdirAsync = promisify(mkdir);
export const dateYYYYMMDD = new Date().toISOString().split('T')[0];

export async function createFolderRecursively(path: string): Promise<void> {
    try {
        await mkdirAsync(path, { recursive: true });
    } catch (error) {
        console.error(`Error creating directory ${path}:`, error);
    }
}

export async function appendLinesToFile(filePath: string, lines: string[]): Promise<void> {
    try {
        const data = lines.join('\n') + '\n';
        await appendFileAsync(filePath, data, { flag: 'a' });
    } catch (error) {
        console.error(`Error appending lines to file ${filePath}:`, error);
    }
}

export function dayFolder(host: string) {
    return `./mllogs/${host}/${dateYYYYMMDD}`;
}

export async function downloadFile(client: any, logInfo: any): Promise<void> {
    const logPath = `./mllogs/${logInfo.host}/${dateYYYYMMDD}`;
    if (!existsSync(logPath)) {
        await mkdirAsync(logPath, { recursive: true });
    }
    const fullPath = resolve(logPath, `${logInfo.filename}`);
    console.log(`Downloading log file [${fullPath}]`);
    const result = await client.mldbClient.eval(freshLogFile(logInfo)).result();
    if (!result[0].value) return
    const lines = result.shift().value?.split('\n')
    console.log(`Writing log file [${fullPath}]`)
    writeFileSync(fullPath, lines.join('\n'))
    return
}

export async function downloadAllLogs(client: any, list: string[]): Promise<void> {
  const downloadPromises = list.map(info => downloadFile(client, info));
  await Promise.all(downloadPromises);
}

