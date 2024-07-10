import { MlClientParameters, buildNewClient } from './marklogicClient';

export const createClientConnection = () => {
    const params: any = {
        host: process.env['ML_HOST'] || 'localhost',
        user: process.env['ML_USER'] || 'admin',
        pwd: process.env['ML_PASS'] || 'admin',
        port: +(process.env['ML_PORT'] || '9000'),
        contentDb: process.env['ML_DATABASE'] || 'Documents',
        modulesDb: process.env['ML_MODULES_DB'] || 'Modules',
        authType: 'digest',
        ssl: process.env['ML_PROTOCOL'] === 'https',
        pathToCa: '',
        rejectUnauthorized: false
    };
    return buildNewClient(params);
};
