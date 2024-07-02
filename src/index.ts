import { mkdir, appendFile, writeFileSync, readFileSync, existsSync } from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';
import { MarklogicClient, MlClientParameters, buildNewClient } from './marklogicClient';

const mkdirAsync = promisify(mkdir);
const appendFileAsync = promisify(appendFile);
const dateYYYYMMDD = new Date().toISOString().split('T')[0];
const CURSOR_CONFIG = `./mllogs/cursors-${dateYYYYMMDD}.json`;
const POLL_TIME = 1000 * 5; // 5 seconds

let state = [];
async function pullLogs(client: MarklogicClient, start: number = 1) {
    // Only request data older than what we already have
    try {
        const result: any = client.mldbClient.eval(followQuery(true));
        result.stream()
            .on('data', async (chunk) => {
                const { value } = chunk
                const info = JSON.parse(value);
                if (!state.length) {
                    // first check in the root folder for a cursors-YYYYMMDD.json
                    if (existsSync(CURSOR_CONFIG)) {
                        console.log('Reading current state from file ...');
                        state = JSON.parse(readFileSync(`./mllogs/cursors-${dateYYYYMMDD}.json`).toString());
                    } else {
                        console.log('No positional file for today. Fetching full logs ...');
                        state = info;
                        // if we are here, we should download all the file in parallel and wait ..
                        await (async () => {
                            try {
                                await downloadAllLogs(client, info);
                                console.log('Finished downloading log files.');
                            } catch (error) {
                                console.error('Error downloading log files:', error);
                            }
                        })();
                        await mkdirAsync('./mllogs', { recursive: true });
                        writeFileSync(CURSOR_CONFIG, JSON.stringify(state));
                    }
                }
                // Check if cursor for any items has changed.
                // If so we retreive the new data for those items
                const changed = []
                state.forEach((item: any, index: number) => {
                    if (item.cursor !== info[index].cursor) {
                        changed.push({
                            ...item,
                            size: info[index].cursor - item.cursor,
                        });
                    }
                })
                if (changed.length) {
                    state = info
                    changed.forEach(async changedLog => {
                        const res: any = await client.mldbClient.eval(changeDataQuery(changedLog)).result();
                        const newLines = res?.shift().value.split('\n').filter((x:string) => x.trim()); // don't want blanks
                        const { host, filename } = changedLog;
                        await createFolderRecursively(dayFolder(host));
                        // append the newLines to the file "filename"  in this folder.
                        // If the file does not exist, create it.
                        appendLinesToFile(`./mllogs/${host}/${dateYYYYMMDD}/${filename}`, newLines)
                    })
                }
            })
            .on('end', async () => {
                await new Promise(resolve => setTimeout(resolve, POLL_TIME));
                pullLogs(client, start);
            })
            .on('error', (err) => {
                console.error('Error:', err);
                client.release();
            });

    } catch (error) {
        console.error('Error pulling logs:', error);
        client.release();
    }
}

async function startPullingLogs() {
    console.log('--------------------')
    const params: MlClientParameters = {
        host: 'localhost',
        user: 'admin',
        pwd: 'admin',
        port: 8000,
        contentDb: 'Documents',
        modulesDb: 'Modules',
        authType: 'digest',
        ssl: false,
        pathToCa: '',
        rejectUnauthorized: true
    };

    const client = buildNewClient(params);
    pullLogs(client);
}

startPullingLogs();

function followQuery(follow: boolean) {

  return `
    const data = []
    const follow = ${follow ? 'true' : 'false'}
    const rotated = /_\\d+\\.txt$/
    Array.from(xdmp.hosts()).forEach(host => {
      const directory = xdmp.dataDirectory(host) + '/Logs/';
      const files = xdmp.filesystemDirectory(directory)
          .filter(file => file.contentLength)
          .filter(file => follow ? !rotated.test(file.filename) : true)
          .map(x => {
            // send only what client needs
            const obj = {
              host,
              filename: x.filename,
              cursor: x.contentLength,
            }
            return obj
          })
        JSON.stringify(files)
      files.forEach(f => data.push(f))
    })
    JSON.stringify(data)
  `;
}

function changeDataQuery({
  host, filename, cursor, size
}) {
  return `
    const directory = xdmp.dataDirectory("${host}") + '/Logs/';
    const name = xdmp.hostName("${host}")
    xdmp.filesystemFile("file://" + name + "/" + directory + "/${filename}").toString().substring(${cursor})
  `
    // xdmp.externalBinary("file://" + name + "/" + directory + "/${filename}", ${cursor + 1}, ${size}).toString()
}

function freshLogFile({
  host, filename
}) {
  return `
    const directory = xdmp.dataDirectory("${host}") + '/Logs/';
    const name = xdmp.hostName("${host}")
    xdmp.filesystemFile("file://" + name + "/" + directory + "/${filename}").toString()
  `
// xdmp.externalBinary("file://" + name + "/" + directory + "/${filename}").toString()
}

async function createFolderRecursively(path: string): Promise<void> {
    try {
        await mkdirAsync(path, { recursive: true });
    } catch (error) {
        console.error(`Error creating directory ${path}:`, error);
    }
}

async function appendLinesToFile(filePath: string, lines: string[]): Promise<void> {
    try {
        const data = lines.join('\n') + '\n';
        await appendFileAsync(filePath, data, { flag: 'a' });
    } catch (error) {
        console.error(`Error appending lines to file ${filePath}:`, error);
    }
}

function dayFolder(host: string) {
    return `./mllogs/${host}/${dateYYYYMMDD}`;
}

async function downloadFile(client: any, logInfo: any): Promise<void> {
    const logPath = `./mllogs/${logInfo.host}/${dateYYYYMMDD}`;
    if (!existsSync(logPath)) {
        await mkdirAsync(logPath, { recursive: true });
    }
    const fullPath = resolve(logPath, `${logInfo.filename}`);
    console.log(`Downloading log file [${fullPath}]`);
    const result = await client.mldbClient.eval(freshLogFile(logInfo)).result();
    const lines = result.shift().value.split('\n')
    console.log(`Writing log file [${fullPath}]`)
    writeFileSync(fullPath, lines.join('\n'))
    return
}

async function downloadAllLogs(client: any, list: string[]): Promise<void> {
  const downloadPromises = list.map(info => downloadFile(client, info));
  await Promise.all(downloadPromises);
}

