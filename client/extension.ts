'use strict'
import * as path from 'path'
import * as vscode from 'vscode'
import * as ml from 'marklogic'
import { QueryResultsContentProvider } from './queryResultsContentProvider'
import { XmlFormattingEditProvider } from './xmlFormatting/Formatting'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import * as logManager from './logViewer/logManager'

const MLDBCLIENT = 'mldbClient'
const SJS = 'sjs'
const XQY = 'xqy'

export function activate(context: vscode.ExtensionContext): void {
    context.globalState.update(MLDBCLIENT, null as ml.DatabaseClient)
    const provider = new QueryResultsContentProvider()

    vscode.workspace.registerTextDocumentContentProvider(
        QueryResultsContentProvider.scheme, provider)

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { scheme: 'mlquery', language: 'xml' },
            new XmlFormattingEditProvider()
        )
    )
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { scheme: 'mlquery', language: 'xsl' },
            new XmlFormattingEditProvider()
        )
    )

    // Register subscriptions for Log Viewer
    logManager.activate(context)
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext): void {
    context.globalState.get<ml.DatabaseClient>(MLDBCLIENT).release()
    context.globalState.update(MLDBCLIENT, null)
}
