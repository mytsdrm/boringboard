// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage} from 'react-intl'

import {AdminModuleSettings} from '../../octoClient'

import './adminPages.scss'

export type AdminModuleKey = keyof AdminModuleSettings

type Props = {
    moduleKey: AdminModuleKey
}

const moduleMessages: Record<AdminModuleKey, {
    titleId: string
    title: string
    descriptionId: string
    description: string
}> = {
    announcement: {
        titleId: 'AdminModulePage.announcement-title',
        title: 'Announcement',
        descriptionId: 'AdminModulePage.announcement-description',
        description: 'Announcement module is enabled. Build the announcement workflow here.',
    },
    reminder: {
        titleId: 'AdminModulePage.reminder-title',
        title: 'Reminder',
        descriptionId: 'AdminModulePage.reminder-description',
        description: 'Reminder module is enabled. Build reminder management here.',
    },
}

const AdminModulePage = (props: Props): JSX.Element => {
    const messages = moduleMessages[props.moduleKey]

    return (
        <div className='AdminPage admin-module-page'>
            <div className='admin-page-header'>
                <div className='admin-page-eyebrow'>
                    <FormattedMessage
                        id='AdminModulePage.eyebrow'
                        defaultMessage='Admin Module'
                    />
                </div>
                <h1>
                    <FormattedMessage
                        id={messages.titleId}
                        defaultMessage={messages.title}
                    />
                </h1>
            </div>
            <section className='admin-page-card admin-module-card'>
                <h2>
                    <FormattedMessage
                        id={messages.titleId}
                        defaultMessage={messages.title}
                    />
                </h2>
                <p>
                    <FormattedMessage
                        id={messages.descriptionId}
                        defaultMessage={messages.description}
                    />
                </p>
            </section>
        </div>
    )
}

export default React.memo(AdminModulePage)
