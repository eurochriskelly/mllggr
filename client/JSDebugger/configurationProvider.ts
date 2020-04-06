/*
 * Copyright (c) 2020 MarkLogic Corporation
 */

import * as vscode from 'vscode'
import {DebugConfiguration, WorkspaceFolder, CancellationToken, ProviderResult} from 'vscode'
import * as request from 'request-promise'
import * as querystring from 'querystring'

export class MLConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, _token?: CancellationToken): ProviderResult<DebugConfiguration> {

        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor
            if (editor && editor.document.languageId === 'javascript') {
                config.type = 'ml-jsdebugger'
                config.name = 'Launch Debug Reques'
                config.request = 'launch'
                config.path = '${file}'
            }
        }
        if (config.request === 'launch' && !config.path) {
            config.path = '${file}'
        }

        return this.resolveRemainingDebugConfiguration(folder, config)
    }

    /* helper function to resolve config parameters */
    private async resolveRemainingDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, _token?: CancellationToken): Promise<DebugConfiguration>  {
        // acquire extension settings
        const wcfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration()
        config.hostname = String(wcfg.get('marklogic.host'))
        config.username = String(wcfg.get('marklogic.username'))
        config.password = String(wcfg.get('marklogic.password'))
        config.database = String(wcfg.get('marklogic.documentsDb'))
        config.modules = String(wcfg.get('marklogic.modulesDb'))
        config.root = String(wcfg.get('marklogic.modulesRoot'))

        if (!config.hostname) {
            return vscode.window.showErrorMessage('Hostname is not provided').then(() => {
                return undefined
            })
        }
        if (!config.username) {
            return vscode.window.showErrorMessage('Username is not provided').then(() => {
                return undefined
            })
        }
        if (!config.password) {
            return vscode.window.showErrorMessage('Password is not provided').then(() => {
                return undefined
            })
        }
        if (config.request === 'attach' && !config.debugServerName) {
            return vscode.window.showErrorMessage('Debug server name is not provided').then(() => {
                return undefined
            })
        }
        if (config.request == 'launch' && !config.database.match('/^\d+$/')) {
            await this.resolveDatabsetoId(config.username, config.password, config.database, config.hostname).then(resp => {
                config.database = resp.match('\r\n\r\n(.*[0-9])\r\n')[1] //better way of parsing?
            }).catch(() => {
                return vscode.window.showErrorMessage('Please enter valid Database').then(() => {
                    return undefined
                })
            })
        }
        if (config.request == 'launch' && !config.modules.match('/^\d+$/')) {
            await this.resolveDatabsetoId(config.username, config.password, config.modules, config.hostname).then(resp => {
                config.modules = resp.match('\r\n\r\n(.*[0-9])\r\n')[1] //better way of parsing?
            }).catch(() => {
                return vscode.window.showErrorMessage('Please enter valid Modules Database or 0 for file system').then(() => {
                    return undefined
                })
            })
        }

        //query for paused requests
        if (config.request === 'attach' && config.username && config.password) {
            const resp = await this.getAvailableRequests(config.username, config.password, config.debugServerName, config.hostname)
            const requests: string[] = JSON.parse(resp).requestIds
            const items = []
            for (let i=0; i< requests.length; i++) {
                try {
                    let resp = await this.getRequestInfo(
                        config.username, config.password, requests[i] as string, config.debugServerName, config.hostname)
                    resp = resp.match('\r\n\r\n(.*)\r\n')[1]
                    const requestText = JSON.parse(resp)['requestText']
                    const startTime = JSON.parse(resp)['startTime']

                    items.push({
                        label:requests[i],
                        description:'module: ' + String(requestText),
                        detail:'startTime: ' + String(startTime)
                    })
                } catch (e) {
                    items.push({
                        label:requests[i]
                    })
                }
            }
            const item = await vscode.window.showQuickPick(items, {placeHolder: 'Select the request to attach to' })
            if (!item) {
                return vscode.window.showErrorMessage('Request not selected').then(() => {
                    return undefined	// abort
                })
            }
            config.rid = item.label
        }

        return config
    }

    private async getAvailableRequests(username: string, password: string, debugServerName: string, hostname: string): Promise<string> {
        const url = `http://${hostname}:8002/jsdbg/v1/paused-requests/${debugServerName}`
        const options = {
            auth: {
                user: username,
                pass: password,
                'sendImmediately': false
            }
        }
        return request.get(url, options)
    }

    private async resolveDatabsetoId(username: string, password: string, database: string, hostname: string): Promise<string> {
        const url = `http://${hostname}:8002/v1/eval`
        const script=`xdmp.database("${database}")`
	    const options: object = {
	        headers : {
	            'Content-type': 'application/x-www-form-urlencoded',
	            'Accept': 'multipart/mixed'
	        },
	        auth: {
	            user: username,
	            pass: password,
	            'sendImmediately': false
            },
            body: `javascript=${querystring.escape(script)}`
	    }
	    return request.post(url, options)
    }

    private async getRequestInfo(username: string, password: string, requestId: string, debugServerName: string, hostname: string): Promise<string> {
        const url = `http://${hostname}:8002/v1/eval`
        const script=`xdmp.requestStatus(xdmp.host(),xdmp.server("${debugServerName}"),"${requestId}")`
	    const options: object = {
	        headers : {
	            'Content-type': 'application/x-www-form-urlencoded',
	            'Accept': 'multipart/mixed'
	        },
	        auth: {
	            user: username,
	            pass: password,
	            'sendImmediately': false
            },
            body: `javascript=${querystring.escape(script)}`
	    }
	    return request.post(url, options)
    }
}

export class DebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): ProviderResult<vscode.DebugAdapterDescriptor> {
        return executable
    }
}

export function _connectServer(servername: string ): void {
    const cfg = vscode.workspace.getConfiguration()
    const username = cfg.get('marklogic.username')
    const password = cfg.get('marklogic.password')
    const hostname = cfg.get('marklogic.host')
    if (!hostname) {
        vscode.window.showErrorMessage('Hostname is not provided')
        return
    }
    if (!username) {
        vscode.window.showErrorMessage('Username is not provided')
        return
    }
    if (!password) {
        vscode.window.showErrorMessage('Password is not provided')
        return
    }
    const url = `http://${hostname}:8002/jsdbg/v1/connect/${servername}`
    const options = {
        headers : {
            'Content-type': 'application/x-www-form-urlencoded',
            'X-Error-Accept': 'application/json'
        },
        auth: {
            user: username,
            pass: password,
            'sendImmediately': false
        }
    }
    request.post(url, options).then(() => {
        vscode.window.showInformationMessage('Debug server connected')
    }).catch(() => {
        vscode.window.showErrorMessage('Debug server connect failed')
    })
}

export function _disonnectServer(servername: string ): void {
    const cfg = vscode.workspace.getConfiguration()
    const username = cfg.get('marklogic.username')
    const password = cfg.get('marklogic.password')
    const hostname = cfg.get('marklogic.host')
    if (!hostname) {
        vscode.window.showErrorMessage('Hostname is not provided')
        return
    }
    if (!username) {
        vscode.window.showErrorMessage('Username is not provided')
        return
    }
    if (!password) {
        vscode.window.showErrorMessage('Password is not provided')
        return
    }
    const url = `http://${hostname}:8002/jsdbg/v1/disconnect/${servername}`
    const options = {
        headers : {
            'Content-type': 'application/x-www-form-urlencoded',
            'X-Error-Accept': 'application/json'
        },
        auth: {
            user: username,
            pass: password,
            'sendImmediately': false
        }
    }
    request.post(url, options).then(() => {
        vscode.window.showInformationMessage('Debug server disconnected')
    }).catch(() => {
        vscode.window.showErrorMessage('Debug server disconnect failed')
    })
}
