// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ChangeEvent, FormEvent, useMemo, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Board} from '../../blocks/board'
import mutator from '../../mutator'
import Button from '../../widgets/buttons/button'
import SettingsIcon from '../../widgets/icons/settings'
import Dialog from '../dialog'
import RootPortal from '../rootPortal'

import './boardIntegrationSettingsButton.scss'

const BOARD_INTEGRATION_PROPERTY = 'boardIntegration'

type BoardIntegrationConfig = {
    repoUrl: string
    devBranch: string
    prodBranch: string
    developmentUrl: string
    productionUrl: string
}

type Props = {
    board: Board
}

const emptyConfig: BoardIntegrationConfig = {
    repoUrl: '',
    devBranch: '',
    prodBranch: '',
    developmentUrl: '',
    productionUrl: '',
}

const getConfig = (board: Board): BoardIntegrationConfig => {
    const value = board.properties?.[BOARD_INTEGRATION_PROPERTY]
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return emptyConfig
    }

    const config = value as Partial<BoardIntegrationConfig>
    return {
        repoUrl: config.repoUrl || '',
        devBranch: config.devBranch || config.branchFilter || '',
        prodBranch: config.prodBranch || '',
        developmentUrl: config.developmentUrl || '',
        productionUrl: config.productionUrl || '',
    }
}

const hasConfigValue = (config: BoardIntegrationConfig): boolean => {
    return Object.values(config).some((value) => value.trim() !== '')
}

const BoardIntegrationSettingsButton = (props: Props): JSX.Element => {
    const intl = useIntl()
    const [showDialog, setShowDialog] = useState(false)
    const [config, setConfig] = useState<BoardIntegrationConfig>(() => getConfig(props.board))

    const storedConfig = useMemo(() => getConfig(props.board), [props.board])

    const openDialog = () => {
        setConfig(storedConfig)
        setShowDialog(true)
    }

    const updateField = (field: keyof BoardIntegrationConfig) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setConfig((current) => ({
            ...current,
            [field]: event.target.value,
        }))
    }

    const saveConfig = async (event: FormEvent) => {
        event.preventDefault()

        const nextConfig = {
            repoUrl: config.repoUrl.trim(),
            devBranch: config.devBranch.trim(),
            prodBranch: config.prodBranch.trim(),
            developmentUrl: config.developmentUrl.trim(),
            productionUrl: config.productionUrl.trim(),
        }

        const nextProperties = {...props.board.properties}
        if (hasConfigValue(nextConfig)) {
            nextProperties[BOARD_INTEGRATION_PROPERTY] = nextConfig
        } else {
            delete nextProperties[BOARD_INTEGRATION_PROPERTY]
        }

        await mutator.updateBoard(
            {
                ...props.board,
                properties: nextProperties,
            },
            props.board,
            'update board integration settings',
        )
        setShowDialog(false)
    }

    return (
        <div className='BoardIntegrationSettingsButton'>
            <Button
                title={intl.formatMessage({id: 'BoardIntegrationSettings.buttonTitle', defaultMessage: 'Board integration settings'})}
                size='medium'
                emphasis='secondary'
                icon={<SettingsIcon/>}
                onClick={openDialog}
            >
                <FormattedMessage
                    id='BoardIntegrationSettings.button'
                    defaultMessage='Setting'
                />
            </Button>
            {showDialog &&
                <RootPortal>
                    <Dialog
                        onClose={() => setShowDialog(false)}
                        className='BoardIntegrationSettingsDialog'
                        size='small'
                        title={
                            <FormattedMessage
                                id='BoardIntegrationSettings.title'
                                defaultMessage='Task Board Settings'
                            />
                        }
                    >
                        <form
                            className='BoardIntegrationSettingsDialog__form'
                            onSubmit={saveConfig}
                        >
                            <label>
                                <span>
                                    <FormattedMessage
                                        id='BoardIntegrationSettings.repoUrl'
                                        defaultMessage='Repository URL'
                                    />
                                </span>
                                <input
                                    type='url'
                                    value={config.repoUrl}
                                    onChange={updateField('repoUrl')}
                                    placeholder='https://github.com/org/repo'
                                />
                            </label>
                            <div className='BoardIntegrationSettingsDialog__branchRow'>
                                <label>
                                    <span>
                                        <FormattedMessage
                                            id='BoardIntegrationSettings.devBranch'
                                            defaultMessage='Dev Branch'
                                        />
                                    </span>
                                    <input
                                        type='text'
                                        value={config.devBranch}
                                        onChange={updateField('devBranch')}
                                        placeholder='develop'
                                    />
                                </label>
                                <label>
                                    <span>
                                        <FormattedMessage
                                            id='BoardIntegrationSettings.prodBranch'
                                            defaultMessage='Prod Branch'
                                        />
                                    </span>
                                    <input
                                        type='text'
                                        value={config.prodBranch}
                                        onChange={updateField('prodBranch')}
                                        placeholder='main'
                                    />
                                </label>
                            </div>
                            <label>
                                <span>
                                    <FormattedMessage
                                        id='BoardIntegrationSettings.developmentUrl'
                                        defaultMessage='Development URL'
                                    />
                                </span>
                                <input
                                    type='url'
                                    value={config.developmentUrl}
                                    onChange={updateField('developmentUrl')}
                                    placeholder='https://dev.example.com'
                                />
                            </label>
                            <label>
                                <span>
                                    <FormattedMessage
                                        id='BoardIntegrationSettings.productionUrl'
                                        defaultMessage='Production URL'
                                    />
                                </span>
                                <input
                                    type='url'
                                    value={config.productionUrl}
                                    onChange={updateField('productionUrl')}
                                    placeholder='https://example.com'
                                />
                            </label>
                            <div className='BoardIntegrationSettingsDialog__footer'>
                                <Button
                                    onClick={() => setShowDialog(false)}
                                    emphasis='secondary'
                                >
                                    <FormattedMessage
                                        id='BoardIntegrationSettings.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </Button>
                                <Button
                                    submit={true}
                                    emphasis='primary'
                                >
                                    <FormattedMessage
                                        id='BoardIntegrationSettings.save'
                                        defaultMessage='Save'
                                    />
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                </RootPortal>
            }
        </div>
    )
}

export default React.memo(BoardIntegrationSettingsButton)
