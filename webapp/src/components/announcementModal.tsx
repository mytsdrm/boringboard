// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react'
import {IconMessage2Exclamation} from '@tabler/icons-react'
import {FormattedMessage} from 'react-intl'

import {
    Announcement,
    ANNOUNCEMENTS_DISMISSED_CONFIG_KEY,
    getAnnouncementDismissalId,
    isAnnouncementActive,
    parseDismissedAnnouncementIds,
} from '../announcements'
import octoClient, {AdminSystemSettings} from '../octoClient'
import {useAppDispatch, useAppSelector} from '../store/hooks'
import {getMyConfig, patchProps} from '../store/users'
import {IUser} from '../user'
import {Utils} from '../utils'
import wsClient, {WSClient} from '../wsclient'

import AppModal from './appModal'

import './announcementModal.scss'

type Props = {
    me: IUser | null
}

const getActiveAnnouncement = (announcements: Announcement[], dismissedIds: string[]): Announcement | null => {
    return [...announcements].
        filter((announcement) => isAnnouncementActive(announcement)).
        filter((announcement) => !dismissedIds.includes(getAnnouncementDismissalId(announcement))).
        sort((a, b) => {
            if (a.priority !== b.priority) {
                const priorityRank: Record<Announcement['priority'], number> = {
                    Normal: 0,
                    Important: 1,
                    Urgent: 2,
                }
                return priorityRank[b.priority] - priorityRank[a.priority]
            }
            return b.createAt - a.createAt
        })[0] || null
}

const AnnouncementModal = (props: Props): JSX.Element | null => {
    const dispatch = useAppDispatch()
    const myConfig = useAppSelector(getMyConfig)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])

    const isAdmin = Boolean(props.me?.roles && Utils.isSystemAdmin(props.me.roles)) || Boolean(props.me?.permissions?.includes('manage_system'))
    const dismissedAnnouncementIds = useMemo(() => parseDismissedAnnouncementIds(myConfig[ANNOUNCEMENTS_DISMISSED_CONFIG_KEY]?.value), [myConfig])
    const activeAnnouncement = useMemo(() => {
        if (!props.me || isAdmin) {
            return null
        }

        return getActiveAnnouncement(announcements, dismissedAnnouncementIds)
    }, [announcements, dismissedAnnouncementIds, isAdmin, props.me])

    useEffect(() => {
        let canceled = false

        async function loadAnnouncements() {
            const settings = await octoClient.getSystemSettings()
            if (!canceled) {
                setAnnouncements(settings.announcements || [])
            }
        }

        const handleSystemSettingsUpdated = (_: WSClient, settings: AdminSystemSettings) => {
            setAnnouncements(settings.announcements || [])
        }

        loadAnnouncements()
        wsClient.addOnSystemSettingsChange(handleSystemSettingsUpdated)

        return () => {
            canceled = true
            wsClient.removeOnSystemSettingsChange(handleSystemSettingsUpdated)
        }
    }, [])

    if (!props.me || !activeAnnouncement) {
        return null
    }

    const closeAnnouncement = async () => {
        if (!activeAnnouncement || !props.me) {
            return
        }

        const nextDismissedIds = Array.from(new Set([...dismissedAnnouncementIds, getAnnouncementDismissalId(activeAnnouncement)]))
        const updatedConfig = await octoClient.patchUserConfig(props.me.id, {
            updatedFields: {
                [ANNOUNCEMENTS_DISMISSED_CONFIG_KEY]: JSON.stringify(nextDismissedIds),
            },
        })
        if (updatedConfig) {
            dispatch(patchProps(updatedConfig))
        }
    }

    return (
        <AppModal
            bodyClassName='AnnouncementModal__body'
            cancelText={(
                <FormattedMessage
                    id='AnnouncementModal.close'
                    defaultMessage='Close'
                />
            )}
            cancelVariant='close'
            className='AnnouncementModal'
            showSaveButton={false}
            title={<>{activeAnnouncement.title}</>}
            titleIcon={<IconMessage2Exclamation size={20}/>}
            onClose={closeAnnouncement}
        >
            <div className={`AnnouncementModal__priority AnnouncementModal__priority--${activeAnnouncement.priority.toLowerCase()}`}>
                {activeAnnouncement.priority}
            </div>
            <p>{activeAnnouncement.message}</p>
        </AppModal>
    )
}

export default React.memo(AnnouncementModal)
