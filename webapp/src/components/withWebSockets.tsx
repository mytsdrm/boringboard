// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useRef} from 'react'

import wsClient, {MMWebSocketClient} from '../wsclient'
import {Utils} from '../utils'

type Props = {
    userId?: string
    manifest?: {
        id: string
        version: string
    }
    webSocketClient?: MMWebSocketClient
    children: React.ReactNode
}

// WithWebSockets component initialises the websocket connection if
// it's not yet running and subscribes to the current team
const WithWebSockets = (props: Props): React.ReactElement => {
    const queryString = new URLSearchParams(window.location.search)
    const lastUserId = useRef(props.userId)

    useEffect(() => {
        // if the websocket client was already connected, do nothing
        if (wsClient.state !== 'init') {
            return
        }

        // this is a temporary solution to disable websocket
        // connections on legacy routes, as there is no such thing as
        // an anonymous websocket connection
        if (Utils.isFocalboardLegacy()) {
            return
        }

        const token = localStorage.getItem('focalboardSessionId') || queryString.get('r') || ''
        if (token) {
            wsClient.authenticate(token)
        }
        wsClient.open()
    }, [props.webSocketClient])

    useEffect(() => {
        const previousUserId = lastUserId.current
        lastUserId.current = props.userId

        if (!props.userId) {
            // logged out: stop receiving the previous user's updates
            if (previousUserId) {
                wsClient.clearAuthentication()
            }
            return
        }

        const token = localStorage.getItem('focalboardSessionId') || queryString.get('r') || ''
        if (wsClient.token !== token) {
            wsClient.authenticate(token)
        }
    }, [props.userId])

    return (
        <>
            {props.children}
        </>
    )
}

export default WithWebSockets
