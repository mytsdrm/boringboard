// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'
import {IconChevronLeft, IconChevronRight, IconEdit, IconMessage2Exclamation, IconPlus, IconRefresh, IconSearch, IconTrash} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'

import {
    Announcement,
    AnnouncementAudience,
    AnnouncementFormState,
    AnnouncementPriority,
    AnnouncementStatus,
    emptyAnnouncementForm,
} from '../../announcements'
import octoClient, {AdminSystemSettings} from '../../octoClient'

import AppModal from '../appModal'
import Dialog from '../dialog'
import RootPortal from '../rootPortal'
import TableModule from '../tableModule/tableModule'

import '@tabler/core/dist/css/tabler.min.css'
import './adminPages.scss'

const ANNOUNCEMENT_PAGE_SIZE = 10

const getCurrentDateTimeInputValue = (): string => {
    const now = new Date()
    const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 19)
}

const createAnnouncementDeliveryKey = (): string => {
    return Date.now().toString()
}

const AdminAnnouncements = (): JSX.Element => {
    const intl = useIntl()
    const [settings, setSettings] = useState<AdminSystemSettings | null>(null)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'All'>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [form, setForm] = useState<AnnouncementFormState>(emptyAnnouncementForm)
    const [showForm, setShowForm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

    useEffect(() => {
        let canceled = false
        async function loadAnnouncements() {
            const nextSettings = await octoClient.getAdminSystemSettings()
            if (!canceled) {
                setSettings(nextSettings)
                setAnnouncements(nextSettings.announcements || [])
            }
        }

        loadAnnouncements()
        return () => {
            canceled = true
        }
    }, [])

    const filteredAnnouncements = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase()

        return [...announcements].
            filter((announcement) => statusFilter === 'All' || announcement.status === statusFilter).
            filter((announcement) => {
                if (!normalizedSearch) {
                    return true
                }

                return [
                    announcement.title,
                    announcement.message,
                    announcement.audience,
                    announcement.priority,
                    announcement.status,
                ].join(' ').toLowerCase().includes(normalizedSearch)
            }).
            sort((a, b) => {
                if (!a.publishAt && !b.publishAt) {
                    return b.createAt - a.createAt
                }
                if (!a.publishAt) {
                    return 1
                }
                if (!b.publishAt) {
                    return -1
                }
                return a.publishAt.localeCompare(b.publishAt)
            })
    }, [announcements, searchQuery, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ANNOUNCEMENT_PAGE_SIZE))
    const paginatedAnnouncements = useMemo(() => {
        const startIndex = (currentPage - 1) * ANNOUNCEMENT_PAGE_SIZE
        return filteredAnnouncements.slice(startIndex, startIndex + ANNOUNCEMENT_PAGE_SIZE)
    }, [currentPage, filteredAnnouncements])
    const visiblePages = useMemo(() => {
        const pages = new Set<number>([1, totalPages, currentPage])

        if (currentPage > 1) {
            pages.add(currentPage - 1)
        }
        if (currentPage < totalPages) {
            pages.add(currentPage + 1)
        }

        return Array.from(pages).
            filter((page) => page >= 1 && page <= totalPages).
            sort((a, b) => a - b)
    }, [currentPage, totalPages])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages))
    }, [totalPages])

    const publishedCount = announcements.filter((announcement) => announcement.status === 'Published').length
    const draftCount = announcements.filter((announcement) => announcement.status === 'Draft').length
    const urgentCount = announcements.filter((announcement) => announcement.priority === 'Urgent').length

    const startAddAnnouncement = () => {
        setForm(emptyAnnouncementForm)
        setShowForm(true)
    }

    const startEditAnnouncement = (announcement: Announcement) => {
        setForm({
            audience: announcement.audience,
            expireAt: announcement.expireAt,
            id: announcement.id,
            message: announcement.message,
            priority: announcement.priority,
            publishAt: announcement.publishAt,
            status: announcement.status,
            title: announcement.title,
        })
        setShowForm(true)
    }

    const closeForm = () => {
        setForm(emptyAnnouncementForm)
        setShowForm(false)
    }

    const persistAnnouncements = async (nextAnnouncements: Announcement[]) => {
        if (!settings) {
            return false
        }

        const savedSettings = await octoClient.saveAdminSystemSettings({
            ...settings,
            announcements: nextAnnouncements,
        })
        if (!savedSettings) {
            return false
        }

        setSettings(savedSettings)
        setAnnouncements(savedSettings.announcements || [])
        return true
    }

    const saveAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const title = form.title.trim()
        if (!title) {
            return
        }

        let nextAnnouncements: Announcement[]
        if (form.id) {
            nextAnnouncements = announcements.map((announcement) => {
                if (announcement.id !== form.id) {
                    return announcement
                }
                return {
                    ...announcement,
                    ...form,
                    message: form.message.trim(),
                    title,
                }
            })
        } else {
            nextAnnouncements = [
                {
                    ...form,
                    createAt: Date.now(),
                    id: `announcement-${Date.now()}`,
                    message: form.message.trim(),
                    title,
                },
                ...announcements,
            ]
        }

        if (await persistAnnouncements(nextAnnouncements)) {
            if (form.status === 'Published') {
                setStatusFilter('Published')
            }
            closeForm()
        }
    }

    const deleteAnnouncement = async () => {
        if (!deleteTarget) {
            return
        }

        if (await persistAnnouncements(announcements.filter((announcement) => announcement.id !== deleteTarget.id))) {
            setDeleteTarget(null)
        }
    }

    const republishAnnouncement = async (targetAnnouncement: Announcement) => {
        await persistAnnouncements(announcements.map((announcement) => {
            if (announcement.id !== targetAnnouncement.id) {
                return announcement
            }

            return {
                ...announcement,
                deliveryKey: createAnnouncementDeliveryKey(),
                expireAt: '',
                publishAt: getCurrentDateTimeInputValue(),
                status: 'Published',
            }
        }))
    }

    const publishAnnouncementNow = async (targetAnnouncement: Announcement) => {
        await persistAnnouncements(announcements.map((announcement) => {
            if (announcement.id !== targetAnnouncement.id) {
                return announcement
            }

            return {
                ...announcement,
                deliveryKey: createAnnouncementDeliveryKey(),
                publishAt: getCurrentDateTimeInputValue(),
                status: 'Published',
            }
        }))
    }

    const formatDate = (value: string): string => {
        if (!value) {
            return '-'
        }

        return intl.formatDate(new Date(value), {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const getStatusBadgeClass = (status: AnnouncementStatus): string => {
        if (status === 'Published') {
            return 'bg-green-lt'
        }
        if (status === 'Draft') {
            return 'bg-blue-lt'
        }
        return 'bg-secondary-lt'
    }

    const renderMetric = (value: number, labelId: string, label: string) => (
        <div className='admin-announcement-metric'>
            <strong>{value}</strong>
            <span>
                <FormattedMessage
                    id={labelId}
                    defaultMessage={label}
                />
            </span>
        </div>
    )

    return (
        <div className='AdminPage admin-announcements-page'>
            <div className='admin-page-header admin-page-header-row'>
                <div>
                    <div className='admin-page-eyebrow'>
                        <FormattedMessage
                            id='AdminAnnouncements.eyebrow'
                            defaultMessage='Announcement'
                        />
                    </div>
                    <h1>
                        <FormattedMessage
                            id='AdminAnnouncements.title'
                            defaultMessage='Announcements'
                        />
                    </h1>
                </div>
                <div className='admin-header-actions'>
                    <label>
                        <select
                            aria-label={intl.formatMessage({
                                id: 'AdminAnnouncements.filter-status',
                                defaultMessage: 'Status',
                            })}
                            className='form-select'
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as AnnouncementStatus | 'All')}
                        >
                            <option value='All'>
                                {intl.formatMessage({id: 'AdminAnnouncements.filter-all', defaultMessage: 'All'})}
                            </option>
                            <option value='Draft'>{'Draft'}</option>
                            <option value='Published'>{'Published'}</option>
                            <option value='Archived'>{'Archived'}</option>
                        </select>
                    </label>
                    <button
                        className='btn btn-primary'
                        type='button'
                        onClick={startAddAnnouncement}
                    >
                        <IconPlus
                            className='icon'
                            size={18}
                        />
                        <FormattedMessage
                            id='AdminAnnouncements.add-announcement'
                            defaultMessage='Add Announcement'
                        />
                    </button>
                </div>
            </div>

            <div className='admin-announcement-metrics'>
                {renderMetric(publishedCount, 'AdminAnnouncements.metric-published', 'Published')}
                {renderMetric(draftCount, 'AdminAnnouncements.metric-draft', 'Draft')}
                {renderMetric(urgentCount, 'AdminAnnouncements.metric-urgent', 'Urgent')}
            </div>

            {showForm &&
                <AppModal
                    bodyClassName='admin-announcement-form'
                    cancelText={(
                        <FormattedMessage
                            id='AdminAnnouncements.cancel'
                            defaultMessage='Cancel'
                        />
                    )}
                    className='admin-announcement-dialog'
                    saveText={(
                        <FormattedMessage
                            id='AdminAnnouncements.save'
                            defaultMessage='Save'
                        />
                    )}
                    title={form.id ? (
                        <FormattedMessage
                            id='AdminAnnouncements.edit-announcement-title'
                            defaultMessage='Edit Announcement'
                        />
                    ) : (
                        <FormattedMessage
                            id='AdminAnnouncements.add-announcement-title'
                            defaultMessage='Add Announcement'
                        />
                    )}
                    titleIcon={<IconMessage2Exclamation size={20}/>}
                    onClose={closeForm}
                    onSubmit={saveAnnouncement}
                >
                    <label className='admin-announcement-form-wide'>
                        <FormattedMessage
                            id='AdminAnnouncements.form-title'
                            defaultMessage='Title'
                        />
                        <input
                            className='form-control'
                            required={true}
                            value={form.title}
                            onChange={(event) => setForm({...form, title: event.target.value})}
                        />
                    </label>
                    <label className='admin-announcement-form-wide'>
                        <FormattedMessage
                            id='AdminAnnouncements.form-message'
                            defaultMessage='Message'
                        />
                        <textarea
                            className='form-control'
                            rows={4}
                            value={form.message}
                            onChange={(event) => setForm({...form, message: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminAnnouncements.form-publish-at'
                            defaultMessage='Publish At'
                        />
                        <input
                            className='form-control'
                            type='datetime-local'
                            value={form.publishAt}
                            onChange={(event) => setForm({...form, publishAt: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminAnnouncements.form-expire-at'
                            defaultMessage='Expire At'
                        />
                        <input
                            className='form-control'
                            type='datetime-local'
                            value={form.expireAt}
                            onChange={(event) => setForm({...form, expireAt: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminAnnouncements.form-audience'
                            defaultMessage='Audience'
                        />
                        <select
                            className='form-select'
                            value={form.audience}
                            onChange={(event) => setForm({...form, audience: event.target.value as AnnouncementAudience})}
                        >
                            <option value='All Users'>{'All Users'}</option>
                            <option value='SuperAdmin'>{'SuperAdmin'}</option>
                            <option value='PublicUser'>{'PublicUser'}</option>
                        </select>
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminAnnouncements.form-priority'
                            defaultMessage='Priority'
                        />
                        <select
                            className='form-select'
                            value={form.priority}
                            onChange={(event) => setForm({...form, priority: event.target.value as AnnouncementPriority})}
                        >
                            <option value='Normal'>{'Normal'}</option>
                            <option value='Important'>{'Important'}</option>
                            <option value='Urgent'>{'Urgent'}</option>
                        </select>
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminAnnouncements.form-status'
                            defaultMessage='Status'
                        />
                        <select
                            className='form-select'
                            value={form.status}
                            onChange={(event) => setForm({...form, status: event.target.value as AnnouncementStatus})}
                        >
                            <option value='Draft'>{'Draft'}</option>
                            <option value='Published'>{'Published'}</option>
                            <option value='Archived'>{'Archived'}</option>
                        </select>
                    </label>
                </AppModal>}

            {deleteTarget &&
                <RootPortal>
                    <Dialog
                        className='admin-announcement-dialog admin-delete-dialog'
                        size='small'
                        title={
                            <FormattedMessage
                                id='AdminAnnouncements.delete-announcement-title'
                                defaultMessage='Delete Announcement'
                            />
                        }
                        onClose={() => setDeleteTarget(null)}
                    >
                        <div className='admin-delete-body'>
                            <p>
                                <FormattedMessage
                                    id='AdminAnnouncements.delete-confirm'
                                    defaultMessage='Delete {title}?'
                                    values={{title: deleteTarget.title}}
                                />
                            </p>
                            <div className='admin-form-actions'>
                                <button
                                    className='btn btn-outline-secondary'
                                    type='button'
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    <FormattedMessage
                                        id='AdminAnnouncements.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </button>
                                <button
                                    className='btn btn-danger'
                                    type='button'
                                    onClick={deleteAnnouncement}
                                >
                                    <FormattedMessage
                                        id='AdminAnnouncements.delete'
                                        defaultMessage='Delete'
                                    />
                                </button>
                            </div>
                        </div>
                    </Dialog>
                </RootPortal>}

            <TableModule
                className='admin-announcements-table-card'
                fileName='announcements'
                printTitle={intl.formatMessage({
                    id: 'AdminAnnouncements.title',
                    defaultMessage: 'Announcements',
                })}
                toolbarLeft={(
                    <label className='admin-announcements-search'>
                        <div className='input-icon'>
                            <span className='input-icon-addon'>
                                <IconSearch size={18}/>
                            </span>
                            <input
                                aria-label={intl.formatMessage({
                                    id: 'AdminAnnouncements.search',
                                    defaultMessage: 'Search',
                                })}
                                className='form-control'
                                placeholder={intl.formatMessage({
                                    id: 'AdminAnnouncements.search-placeholder',
                                    defaultMessage: 'Search announcements',
                                })}
                                type='search'
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </label>
                )}
            >
                <div className='table-responsive'>
                    <table className='table table-vcenter card-table admin-table admin-announcements-table'>
                        <thead>
                            <tr>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-title'
                                        defaultMessage='Announcement'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-audience'
                                        defaultMessage='Audience'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-priority'
                                        defaultMessage='Priority'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-published-at'
                                        defaultMessage='Published At'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-schedule'
                                        defaultMessage='Schedule'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-status'
                                        defaultMessage='Status'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminAnnouncements.table-actions'
                                        defaultMessage='Actions'
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedAnnouncements.map((announcement) => (
                                <tr key={announcement.id}>
                                    <td>
                                        <span className='admin-announcement-title-cell'>
                                            <span className='admin-announcement-icon'>
                                                <IconMessage2Exclamation size={18}/>
                                            </span>
                                            <span>
                                                <strong>{announcement.title}</strong>
                                                <small>{announcement.message || '-'}</small>
                                            </span>
                                        </span>
                                    </td>
                                    <td>{announcement.audience}</td>
                                    <td>{announcement.priority}</td>
                                    <td className='admin-date-cell'>{formatDate(announcement.publishAt)}</td>
                                    <td className='admin-date-cell'>
                                        <span className='admin-announcement-schedule'>
                                            <strong>{announcement.expireAt ? formatDate(announcement.expireAt) : '-'}</strong>
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusBadgeClass(announcement.status)}`}>
                                            {announcement.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className='admin-table-actions'>
                                            {announcement.status === 'Published' &&
                                                <button
                                                    aria-label={intl.formatMessage({
                                                        id: 'AdminAnnouncements.republish-announcement',
                                                        defaultMessage: 'Republish announcement',
                                                    })}
                                                    className='btn btn-icon btn-outline-primary'
                                                    title={intl.formatMessage({
                                                        id: 'AdminAnnouncements.republish-announcement',
                                                        defaultMessage: 'Republish announcement',
                                                    })}
                                                    type='button'
                                                    onClick={() => republishAnnouncement(announcement)}
                                                >
                                                    <IconRefresh
                                                        className='icon'
                                                        size={18}
                                                    />
                                                </button>
                                            }
                                            {announcement.status === 'Draft' && !announcement.publishAt &&
                                                <button
                                                    aria-label={intl.formatMessage({
                                                        id: 'AdminAnnouncements.publish-now-announcement',
                                                        defaultMessage: 'Publish Now',
                                                    })}
                                                    className='btn btn-icon btn-outline-primary'
                                                    title={intl.formatMessage({
                                                        id: 'AdminAnnouncements.publish-now-announcement',
                                                        defaultMessage: 'Publish Now',
                                                    })}
                                                    type='button'
                                                    onClick={() => publishAnnouncementNow(announcement)}
                                                >
                                                    <IconMessage2Exclamation
                                                        className='icon'
                                                        size={18}
                                                    />
                                                </button>
                                            }
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminAnnouncements.edit-announcement',
                                                    defaultMessage: 'Edit announcement',
                                                })}
                                                className='btn btn-icon btn-outline-secondary'
                                                title={intl.formatMessage({
                                                    id: 'AdminAnnouncements.edit-announcement',
                                                    defaultMessage: 'Edit announcement',
                                                })}
                                                type='button'
                                                onClick={() => startEditAnnouncement(announcement)}
                                            >
                                                <IconEdit
                                                    className='icon'
                                                    size={18}
                                                />
                                            </button>
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminAnnouncements.delete-announcement',
                                                    defaultMessage: 'Delete announcement',
                                                })}
                                                className='btn btn-icon btn-outline-danger'
                                                title={intl.formatMessage({
                                                    id: 'AdminAnnouncements.delete-announcement',
                                                    defaultMessage: 'Delete announcement',
                                                })}
                                                type='button'
                                                onClick={() => setDeleteTarget(announcement)}
                                            >
                                                <IconTrash
                                                    className='icon'
                                                    size={18}
                                                />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAnnouncements.length === 0 &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='AdminAnnouncements.empty'
                                defaultMessage='No announcements found.'
                            />
                        </div>}
                </div>
                {filteredAnnouncements.length > 0 &&
                    <div className='card-footer admin-users-pagination'>
                        <div className='admin-users-pagination-inner'>
                            <span className='text-secondary admin-users-pagination-summary'>
                                <FormattedMessage
                                    id='AdminAnnouncements.pagination-summary'
                                    defaultMessage='Page {page}'
                                    values={{page: currentPage}}
                                />
                            </span>
                            <ul className='pagination m-0'>
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'AdminAnnouncements.previous-page',
                                            defaultMessage: 'Previous page',
                                        })}
                                        className='page-link'
                                        disabled={currentPage === 1}
                                        type='button'
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                    >
                                        <IconChevronLeft
                                            className='icon'
                                            size={18}
                                        />
                                    </button>
                                </li>
                                {visiblePages.map((page, index) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && page - visiblePages[index - 1] > 1 &&
                                            <li className='page-item disabled'>
                                                <span className='page-link'>{'...'}</span>
                                            </li>}
                                        <li className={`page-item ${page === currentPage ? 'active' : ''}`}>
                                            <button
                                                className='page-link'
                                                disabled={page === currentPage}
                                                type='button'
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        </li>
                                    </React.Fragment>
                                ))}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'AdminAnnouncements.next-page',
                                            defaultMessage: 'Next page',
                                        })}
                                        className='page-link'
                                        disabled={currentPage === totalPages}
                                        type='button'
                                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                    >
                                        <IconChevronRight
                                            className='icon'
                                            size={18}
                                        />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>}
            </TableModule>
        </div>
    )
}

export default React.memo(AdminAnnouncements)
