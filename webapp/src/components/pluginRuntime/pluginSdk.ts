// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Utils} from '../../utils'

type PluginAction = {
    label: string
    run: () => void
}

type PluginCardProps = {
    actions?: PluginAction[]
    description?: string
    title: string
}

type PluginTableProps = {
    columns: string[]
    rows: string[][]
}

type PluginHeaderProps = {
    description?: string
    title: string
}

type BuiltinApiRequestOptions = {
    body?: unknown
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
}

type BuiltinApi = {
    delete: <T = unknown>(path: string) => Promise<T>
    get: <T = unknown>(path: string) => Promise<T>
    patch: <T = unknown>(path: string, body?: unknown) => Promise<T>
    post: <T = unknown>(path: string, body?: unknown) => Promise<T>
    put: <T = unknown>(path: string, body?: unknown) => Promise<T>
}

export type BoringBoardPluginSdk = {
    api: BuiltinApi
    callApi: <T = unknown>(path: string, options?: BuiltinApiRequestOptions) => Promise<T>
    clear: () => void
    create: (type: 'card' | 'table', props: PluginCardProps | PluginTableProps) => void
    createCard: (props: PluginCardProps) => void
    createPlugin: (props: PluginHeaderProps) => void
    createTable: (props: PluginTableProps) => void
    exec: (name: string) => void
    log: (message: string) => void
    register: (name: string, fn: () => void) => void
}

type CreatePluginSdkOptions = {
    log: (message: string) => void
    root: HTMLElement
}

export const createBoringBoardPluginSdk = (options: CreatePluginSdkOptions): BoringBoardPluginSdk => {
    const actions: Record<string, () => void> = {}
    const page = document.createElement('main')
    page.style.cssText = 'width: 100%; min-height: 100%; box-sizing: border-box; padding: 24px; background: #f8fafc; font-family: Inter, system-ui, sans-serif;'

    const clear = () => {
        options.root.replaceChildren()
        page.replaceChildren()
        options.root.appendChild(page)
    }

    clear()

    const sdk: BoringBoardPluginSdk = {
        api: {
            delete: (path) => callBuiltinApi(path, {method: 'DELETE'}),
            get: (path) => callBuiltinApi(path, {method: 'GET'}),
            patch: (path, body) => callBuiltinApi(path, {body, method: 'PATCH'}),
            post: (path, body) => callBuiltinApi(path, {body, method: 'POST'}),
            put: (path, body) => callBuiltinApi(path, {body, method: 'PUT'}),
        },
        callApi: callBuiltinApi,
        clear,
        create(type, props) {
            if (type === 'card') {
                sdk.createCard(props as PluginCardProps)
                return
            }
            sdk.createTable(props as PluginTableProps)
        },
        createCard(props) {
            page.appendChild(createCardElement(props))
        },
        createPlugin(props) {
            page.appendChild(createHeaderElement(props))
        },
        createTable(props) {
            page.appendChild(createTableElement(props))
        },
        exec(name) {
            if (actions[name]) {
                actions[name]()
                return
            }
            options.log(`Missing plugin action: ${name}`)
        },
        log: options.log,
        register(name, fn) {
            actions[name] = fn
        },
    }

    return sdk
}

const callBuiltinApi = async <T, >(path: string, options: BuiltinApiRequestOptions = {}): Promise<T> => {
    if (!path.startsWith('/api/v2/')) {
        throw new Error('BoringBoard plugin API calls must use /api/v2 paths.')
    }

    const response = await fetch(`${Utils.getBaseURL(true).replace(/\/$/, '')}${path}`, {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers: {
            Accept: 'application/json',
            Authorization: localStorage.getItem('focalboardSessionId') ? `Bearer ${localStorage.getItem('focalboardSessionId')}` : '',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        method: options.method || 'GET',
    })

    if (!response.ok) {
        throw new Error(`BoringBoard API request failed: ${response.status}`)
    }

    if (response.status === 204) {
        return undefined as unknown as T
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        return await response.json() as T
    }

    return await response.text() as unknown as T
}

const createHeaderElement = (props: PluginHeaderProps): HTMLElement => {
    const header = document.createElement('header')
    header.style.cssText = 'margin-bottom: 16px; padding: 20px; border: 1px solid #d0d5dd; border-radius: 10px; background: #ffffff; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);'

    const title = document.createElement('h1')
    title.textContent = props.title
    title.style.cssText = 'margin: 0 0 6px; color: #101828; font-size: 24px; line-height: 32px;'

    const description = document.createElement('p')
    description.textContent = props.description || ''
    description.style.cssText = 'margin: 0; color: #667085; line-height: 1.5;'

    header.append(title, description)
    return header
}

const createCardElement = (props: PluginCardProps): HTMLElement => {
    const card = document.createElement('section')
    card.style.cssText = 'margin-bottom: 16px; padding: 20px; border: 1px solid #d0d5dd; border-radius: 10px; background: #ffffff; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);'

    const title = document.createElement('h2')
    title.textContent = props.title
    title.style.cssText = 'margin: 0 0 6px; color: #101828; font-size: 20px;'

    const description = document.createElement('p')
    description.textContent = props.description || ''
    description.style.cssText = 'margin: 0 0 16px; color: #667085; line-height: 1.5;'

    card.append(title, description)
    ;(props.actions || []).forEach((action) => {
        const button = document.createElement('button')
        button.textContent = action.label
        button.style.cssText = 'height: 38px; padding: 0 14px; border: 0; border-radius: 8px; background: #1c58d9; color: #ffffff; font-weight: 800; cursor: pointer;'
        button.addEventListener('click', action.run)
        card.appendChild(button)
    })

    return card
}

const createTableElement = (props: PluginTableProps): HTMLElement => {
    const wrapper = document.createElement('section')
    wrapper.style.cssText = 'overflow: auto; border: 1px solid #d0d5dd; border-radius: 10px; background: #ffffff;'

    const table = document.createElement('table')
    table.style.cssText = 'width: 100%; border-collapse: collapse;'

    const head = document.createElement('thead')
    const headRow = document.createElement('tr')
    props.columns.forEach((column) => {
        const cell = document.createElement('th')
        cell.textContent = column
        cell.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #eaecf0; background: #f8fafc; color: #667085; font-size: 11px; text-align: left; text-transform: uppercase;'
        headRow.appendChild(cell)
    })
    head.appendChild(headRow)

    const body = document.createElement('tbody')
    props.rows.forEach((row) => {
        const tableRow = document.createElement('tr')
        row.forEach((value) => {
            const cell = document.createElement('td')
            cell.textContent = value
            cell.style.cssText = 'padding: 13px 16px; border-bottom: 1px solid #eaecf0; color: #344054; font-size: 13px; font-weight: 650;'
            tableRow.appendChild(cell)
        })
        body.appendChild(tableRow)
    })

    table.append(head, body)
    wrapper.appendChild(table)
    return wrapper
}
