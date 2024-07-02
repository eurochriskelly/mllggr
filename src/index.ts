import { writeFileSync, readFileSync, existsSync } from 'fs';
import { MarklogicClient } from './marklogicClient';
import { followQuery, changeDataQuery } from './eval-strings';
import { createClientConnection } from './connection';
import { mkdirAsync, appendLinesToFile, createFolderRecursively, dayFolder, downloadAllLogs, dateYYYYMMDD } from './utils';

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
    await pullLogs(createClientConnection());
}

startPullingLogs();


