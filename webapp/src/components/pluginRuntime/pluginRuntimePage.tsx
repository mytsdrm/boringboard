// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useRef, useState} from 'react'
import {useHistory, useRouteMatch} from 'react-router-dom'

import {Utils} from '../../utils'
import {IUser} from '../../user'
import {getMe} from '../../store/users'
import {useAppSelector} from '../../store/hooks'
import {getStoredPluginRuntimePackage, PluginRuntimePackage, PLUGIN_PACKAGE_UPDATED_EVENT} from '../admin/pluginModuleStorage'

import PluginPageContainer from './pluginPageContainer'
import {BoringBoardPluginSdk, createBoringBoardPluginSdk} from './pluginSdk'
import './pluginPageContainer.scss'

const createPluginMount = (code: string): ((plugin: BoringBoardPluginSdk, root: HTMLElement, config: unknown) => void) => {
    const module = {exports: undefined as unknown}

    // The current frontend plugin prototype evaluates imported JavaScript locally; replace this with a sandboxed runtime before production.
    // eslint-disable-next-line no-new-func
    const factory = new Function('module', 'exports', code)
    factory(module, module.exports)

    if (typeof module.exports !== 'function') {
        throw new Error('Plugin entry must export a mount function.')
    }

    return module.exports as (plugin: BoringBoardPluginSdk, root: HTMLElement, config: unknown) => void
}

const PluginRuntimePage = (): JSX.Element|null => {
    const history = useHistory()
    const match = useRouteMatch<{pluginId: string}>()
    const me = useAppSelector<IUser|null>(getMe)
    const rootRef = useRef<HTMLDivElement|null>(null)
    const [runtimePackage, setRuntimePackage] = useState<PluginRuntimePackage|null>(getStoredPluginRuntimePackage())
    const [runtimeError, setRuntimeError] = useState('')
    const isSystemAdmin = Boolean(me?.roles && Utils.isSystemAdmin(me.roles)) || Boolean(me?.permissions?.includes('manage_system'))

    useEffect(() => {
        const updatePluginSettings = () => {
            setRuntimePackage(getStoredPluginRuntimePackage())
        }

        window.addEventListener(PLUGIN_PACKAGE_UPDATED_EVENT, updatePluginSettings)
        window.addEventListener('storage', updatePluginSettings)

        return () => {
            window.removeEventListener(PLUGIN_PACKAGE_UPDATED_EVENT, updatePluginSettings)
            window.removeEventListener('storage', updatePluginSettings)
        }
    }, [])

    useEffect(() => {
        if (!me) {
            return
        }

        if (!runtimePackage) {
            history.replace('/dashboard')
            return
        }

        const routePluginId = decodeURIComponent(match.params.pluginId || '')
        const canViewPlugin = runtimePackage.menuSettings.id === routePluginId && (!runtimePackage.menuSettings.adminOnly || isSystemAdmin)
        if (!canViewPlugin) {
            history.replace('/dashboard')
        }
    }, [history, isSystemAdmin, match.params.pluginId, me, runtimePackage])

    useEffect(() => {
        const root = rootRef.current
        if (!root || !runtimePackage) {
            return
        }

        try {
            setRuntimeError('')
            const plugin = createBoringBoardPluginSdk({
                log: (message: string) => {
                    Utils.log(`[Plugin:${runtimePackage.menuSettings.id}] ${message}`)
                },
                root,
            })
            createPluginMount(runtimePackage.code)(plugin, root, runtimePackage.config)
        } catch (error) {
            root.replaceChildren()
            setRuntimeError(error instanceof Error ? error.message : String(error))
        }
    }, [runtimePackage])

    if (!me || !runtimePackage) {
        return null
    }

    return (
        <PluginPageContainer
            error={runtimeError}
            rootRef={rootRef}
        />
    )
}

export default React.memo(PluginRuntimePage)
