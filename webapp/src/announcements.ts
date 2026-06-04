// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type AnnouncementStatus = 'Draft' | 'Published' | 'Archived'
export type AnnouncementAudience = 'All Users' | 'SuperAdmin' | 'PublicUser'
export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent'

export type Announcement = {
    id: string
    title: string
    message: string
    audience: AnnouncementAudience
    priority: AnnouncementPriority
    publishAt: string
    expireAt: string
    status: AnnouncementStatus
    createAt: number
    deliveryKey?: string
}

export type AnnouncementFormState = Omit<Announcement, 'createAt'>

export const ANNOUNCEMENTS_DISMISSED_CONFIG_KEY = 'dismissedAnnouncementIds'

export const emptyAnnouncementForm: AnnouncementFormState = {
    audience: 'All Users',
    expireAt: '',
    id: '',
    message: '',
    priority: 'Normal',
    publishAt: '',
    status: 'Draft',
    title: '',
}

export const isAnnouncementActive = (announcement: Announcement, now = new Date()): boolean => {
    if (announcement.status !== 'Published') {
        return false
    }

    if (announcement.publishAt && new Date(announcement.publishAt) > now) {
        return false
    }

    if (announcement.expireAt && new Date(announcement.expireAt) <= now) {
        return false
    }

    return announcement.audience === 'All Users' || announcement.audience === 'PublicUser'
}

export const getAnnouncementDismissalId = (announcement: Announcement): string => {
    return `${announcement.id}:${announcement.deliveryKey || announcement.publishAt || announcement.createAt}`
}

export const parseDismissedAnnouncementIds = (value?: string): string[] => {
    try {
        if (!value) {
            return []
        }

        const dismissedIds = JSON.parse(value) as string[]
        return Array.isArray(dismissedIds) ? dismissedIds : []
    } catch {
        return []
    }
}
