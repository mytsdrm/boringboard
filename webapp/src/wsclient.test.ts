// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WSClient, ACTION_AUTH, ACTION_PING, ACTION_SUBSCRIBE_TEAM} from './wsclient'

class FakeWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    static instances: FakeWebSocket[] = []

    url: string
    readyState = FakeWebSocket.CONNECTING
    sent: any[] = []
    onopen: (() => void) | null = null
    onclose: ((e: {code: number, reason: string}) => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    onmessage: ((e: {data: string}) => void) | null = null

    constructor(url: string) {
        this.url = url
        FakeWebSocket.instances.push(this)
    }

    send(data: string) {
        if (this.readyState !== FakeWebSocket.OPEN) {
            throw new Error('not open')
        }
        this.sent.push(JSON.parse(data))
    }

    close() {
        this.readyState = FakeWebSocket.CLOSED
    }

    // test helpers
    serverOpen() {
        this.readyState = FakeWebSocket.OPEN
        this.onopen?.()
    }

    serverClose() {
        this.readyState = FakeWebSocket.CLOSED
        this.onclose?.({code: 1006, reason: ''})
    }

    serverSend(message: unknown) {
        this.onmessage?.({data: JSON.stringify(message)})
    }

    sentActions(): string[] {
        return this.sent.map((m) => m.action)
    }
}

const latest = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]

describe('WSClient connection handling', () => {
    const originalWebSocket = global.WebSocket

    beforeEach(() => {
        jest.useFakeTimers()
        FakeWebSocket.instances = []
        global.WebSocket = FakeWebSocket as any
        jest.spyOn(Math, 'random').mockReturnValue(0.5)
    })

    afterEach(() => {
        jest.useRealTimers()
        global.WebSocket = originalWebSocket
        jest.restoreAllMocks()
    })

    test('authenticates and resubscribes after an unexpected close, with backoff', () => {
        const client = new WSClient('http://localhost:8000')
        const onReconnect = jest.fn()
        client.addOnReconnect(onReconnect)
        client.authenticate('token-1')
        client.subscribeToTeam('team-1')
        client.open()

        latest().serverOpen()
        expect(latest().sentActions()).toEqual([ACTION_AUTH, ACTION_SUBSCRIBE_TEAM])

        latest().serverClose()
        expect(client.state).toBe('close')
        expect(FakeWebSocket.instances).toHaveLength(1)

        // first retry after about a second
        jest.advanceTimersByTime(1000)
        expect(FakeWebSocket.instances).toHaveLength(2)
        latest().serverOpen()
        expect(latest().sentActions()).toEqual([ACTION_AUTH, ACTION_SUBSCRIBE_TEAM])
        expect(onReconnect).toHaveBeenCalledTimes(1)

        // failed retries back off
        latest().serverClose()
        jest.advanceTimersByTime(1000)
        expect(FakeWebSocket.instances).toHaveLength(3)
        latest().serverClose()
        jest.advanceTimersByTime(1000)
        expect(FakeWebSocket.instances).toHaveLength(3)
        jest.advanceTimersByTime(1000)
        expect(FakeWebSocket.instances).toHaveLength(4)
    })

    test('reopens a connection that stops answering heartbeats', () => {
        const client = new WSClient('http://localhost:8000')
        client.open()
        const first = latest()
        first.serverOpen()

        jest.advanceTimersByTime(20000)
        expect(first.sentActions()).toContain(ACTION_PING)
        first.serverSend({action: 'PONG'})

        // the server goes quiet
        jest.advanceTimersByTime(60000)
        expect(FakeWebSocket.instances.length).toBeGreaterThan(1)
        expect(first.readyState).toBe(FakeWebSocket.CLOSED)
    })

    test('opens a new connection when the session token changes', () => {
        const client = new WSClient('http://localhost:8000')
        client.authenticate('token-1')
        client.open()
        latest().serverOpen()

        client.authenticate('token-2')
        expect(FakeWebSocket.instances).toHaveLength(2)
        latest().serverOpen()
        expect(latest().sent[0]).toEqual({action: ACTION_AUTH, token: 'token-2'})
    })

    test('drops the authenticated connection on logout', () => {
        const client = new WSClient('http://localhost:8000')
        client.authenticate('token-1')
        client.open()
        latest().serverOpen()

        client.clearAuthentication()
        expect(FakeWebSocket.instances).toHaveLength(2)
        latest().serverOpen()
        expect(latest().sentActions()).not.toContain(ACTION_AUTH)
    })

    test('does not reopen after an explicit close', () => {
        const client = new WSClient('http://localhost:8000')
        client.open()
        latest().serverOpen()
        latest().serverClose()
        client.close()
        jest.advanceTimersByTime(60000)
        expect(FakeWebSocket.instances).toHaveLength(1)
    })

    test('passes client config updates to listeners', () => {
        const client = new WSClient('http://localhost:8000')
        const onConfig = jest.fn()
        client.addOnConfigChange(onConfig)
        client.open()
        latest().serverOpen()
        latest().serverSend({action: 'UPDATE_CLIENT_CONFIG', clientconfig: {telemetry: false}})
        expect(onConfig).toHaveBeenCalledWith(client, {telemetry: false})
    })
})
