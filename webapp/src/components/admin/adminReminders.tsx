// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'
import {IconBellRinging, IconChevronLeft, IconChevronRight, IconEdit, IconPlus, IconSearch, IconTrash} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'

import AppModal from '../appModal'
import Dialog from '../dialog'
import RootPortal from '../rootPortal'
import TableModule from '../tableModule/tableModule'

import '@tabler/core/dist/css/tabler.min.css'
import './adminPages.scss'

type ReminderStatus = 'Active' | 'Paused'
type ReminderAudience = 'All Users' | 'SuperAdmin' | 'PublicUser'
type ReminderChannel = 'In-app' | 'Email' | 'WhatsApp' | 'Telegram'
type ReminderRepeat = 'Never' | 'Daily' | 'Weekly' | 'Monthly'

type Reminder = {
    id: string
    title: string
    description: string
    audience: ReminderAudience
    channel: ReminderChannel
    remindAt: string
    repeat: ReminderRepeat
    status: ReminderStatus
    createAt: number
}

type ReminderFormState = Omit<Reminder, 'createAt'>

const REMINDERS_STORAGE_KEY = 'boringboardAdminReminders'
const REMINDER_PAGE_SIZE = 10

const emptyForm: ReminderFormState = {
    audience: 'All Users',
    channel: 'In-app',
    description: '',
    id: '',
    remindAt: '',
    repeat: 'Never',
    status: 'Active',
    title: '',
}

const defaultReminders: Reminder[] = [
    {
        audience: 'All Users',
        channel: 'In-app',
        createAt: Date.now(),
        description: 'Review open task boards and follow up on stale cards.',
        id: 'default-weekly-review',
        remindAt: '',
        repeat: 'Weekly',
        status: 'Active',
        title: 'Weekly task board review',
    },
]

const loadStoredReminders = (): Reminder[] => {
    try {
        const value = window.localStorage.getItem(REMINDERS_STORAGE_KEY)
        if (!value) {
            return defaultReminders
        }

        const reminders = JSON.parse(value) as Reminder[]
        return Array.isArray(reminders) ? reminders : defaultReminders
    } catch {
        return defaultReminders
    }
}

const saveStoredReminders = (reminders: Reminder[]) => {
    window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders))
}

const AdminReminders = (): JSX.Element => {
    const intl = useIntl()
    const [reminders, setReminders] = useState<Reminder[]>(loadStoredReminders)
    const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'All'>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [form, setForm] = useState<ReminderFormState>(emptyForm)
    const [showForm, setShowForm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)

    useEffect(() => {
        saveStoredReminders(reminders)
    }, [reminders])

    const filteredReminders = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase()

        return [...reminders].
            filter((reminder) => statusFilter === 'All' || reminder.status === statusFilter).
            filter((reminder) => {
                if (!normalizedSearch) {
                    return true
                }

                return [
                    reminder.title,
                    reminder.description,
                    reminder.audience,
                    reminder.channel,
                    reminder.repeat,
                    reminder.status,
                ].join(' ').toLowerCase().includes(normalizedSearch)
            }).
            sort((a, b) => {
                if (!a.remindAt && !b.remindAt) {
                    return b.createAt - a.createAt
                }
                if (!a.remindAt) {
                    return 1
                }
                if (!b.remindAt) {
                    return -1
                }
                return a.remindAt.localeCompare(b.remindAt)
            })
    }, [reminders, searchQuery, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filteredReminders.length / REMINDER_PAGE_SIZE))
    const paginatedReminders = useMemo(() => {
        const startIndex = (currentPage - 1) * REMINDER_PAGE_SIZE
        return filteredReminders.slice(startIndex, startIndex + REMINDER_PAGE_SIZE)
    }, [currentPage, filteredReminders])
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

    const activeCount = reminders.filter((reminder) => reminder.status === 'Active').length
    const pausedCount = reminders.filter((reminder) => reminder.status === 'Paused').length
    const scheduledCount = reminders.filter((reminder) => reminder.remindAt).length

    const startAddReminder = () => {
        setForm(emptyForm)
        setShowForm(true)
    }

    const startEditReminder = (reminder: Reminder) => {
        setForm({
            audience: reminder.audience,
            channel: reminder.channel,
            description: reminder.description,
            id: reminder.id,
            remindAt: reminder.remindAt,
            repeat: reminder.repeat,
            status: reminder.status,
            title: reminder.title,
        })
        setShowForm(true)
    }

    const closeForm = () => {
        setForm(emptyForm)
        setShowForm(false)
    }

    const saveReminder = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const title = form.title.trim()
        if (!title) {
            return
        }

        if (form.id) {
            setReminders((currentReminders) => currentReminders.map((reminder) => {
                if (reminder.id !== form.id) {
                    return reminder
                }
                return {
                    ...reminder,
                    ...form,
                    description: form.description.trim(),
                    title,
                }
            }))
        } else {
            setReminders((currentReminders) => [
                {
                    ...form,
                    createAt: Date.now(),
                    description: form.description.trim(),
                    id: `reminder-${Date.now()}`,
                    title,
                },
                ...currentReminders,
            ])
        }

        closeForm()
    }

    const deleteReminder = () => {
        if (!deleteTarget) {
            return
        }

        setReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== deleteTarget.id))
        setDeleteTarget(null)
    }

    const formatReminderDate = (value: string): string => {
        if (!value) {
            return intl.formatMessage({
                id: 'AdminReminders.unscheduled',
                defaultMessage: 'Not scheduled',
            })
        }

        return intl.formatDate(new Date(value), {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const renderMetric = (value: number, labelId: string, label: string) => (
        <div className='admin-reminder-metric'>
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
        <div className='AdminPage admin-reminders-page'>
            <div className='admin-page-header admin-page-header-row'>
                <div>
                    <div className='admin-page-eyebrow'>
                        <FormattedMessage
                            id='AdminReminders.eyebrow'
                            defaultMessage='Reminder'
                        />
                    </div>
                    <h1>
                        <FormattedMessage
                            id='AdminReminders.title'
                            defaultMessage='Reminders'
                        />
                    </h1>
                </div>
                <div className='admin-header-actions'>
                    <label>
                        <select
                            aria-label={intl.formatMessage({
                                id: 'AdminReminders.filter-status',
                                defaultMessage: 'Status',
                            })}
                            className='form-select'
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as ReminderStatus | 'All')}
                        >
                            <option value='All'>
                                {intl.formatMessage({id: 'AdminReminders.filter-all', defaultMessage: 'All'})}
                            </option>
                            <option value='Active'>{'Active'}</option>
                            <option value='Paused'>{'Paused'}</option>
                        </select>
                    </label>
                    <button
                        className='btn btn-primary'
                        type='button'
                        onClick={startAddReminder}
                    >
                        <IconPlus
                            className='icon'
                            size={18}
                        />
                        <FormattedMessage
                            id='AdminReminders.add-reminder'
                            defaultMessage='Add Reminder'
                        />
                    </button>
                </div>
            </div>

            <div className='admin-reminder-metrics'>
                {renderMetric(activeCount, 'AdminReminders.metric-active', 'Active')}
                {renderMetric(pausedCount, 'AdminReminders.metric-paused', 'Paused')}
                {renderMetric(scheduledCount, 'AdminReminders.metric-scheduled', 'Scheduled')}
            </div>

            {showForm &&
                <AppModal
                    bodyClassName='admin-reminder-form'
                    cancelText={(
                        <FormattedMessage
                            id='AdminReminders.cancel'
                            defaultMessage='Cancel'
                        />
                    )}
                    className='admin-reminder-dialog'
                    saveText={(
                        <FormattedMessage
                            id='AdminReminders.save'
                            defaultMessage='Save'
                        />
                    )}
                    title={
                        form.id ? (
                            <FormattedMessage
                                id='AdminReminders.edit-reminder-title'
                                defaultMessage='Edit Reminder'
                            />
                        ) : (
                            <FormattedMessage
                                id='AdminReminders.add-reminder-title'
                                defaultMessage='Add Reminder'
                            />
                        )
                    }
                    titleIcon={<IconBellRinging size={20}/>}
                    onClose={closeForm}
                    onSubmit={saveReminder}
                >
                    <label className='admin-reminder-form-wide'>
                        <FormattedMessage
                            id='AdminReminders.form-title'
                            defaultMessage='Title'
                        />
                        <input
                            className='form-control'
                            required={true}
                            value={form.title}
                            onChange={(event) => setForm({...form, title: event.target.value})}
                        />
                    </label>
                    <label className='admin-reminder-form-wide'>
                        <FormattedMessage
                            id='AdminReminders.form-description'
                            defaultMessage='Description'
                        />
                        <textarea
                            className='form-control'
                            rows={3}
                            value={form.description}
                            onChange={(event) => setForm({...form, description: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminReminders.form-remind-at'
                            defaultMessage='Remind At'
                        />
                        <input
                            className='form-control'
                            type='datetime-local'
                            value={form.remindAt}
                            onChange={(event) => setForm({...form, remindAt: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminReminders.form-repeat'
                            defaultMessage='Repeat'
                        />
                        <select
                            className='form-select'
                            value={form.repeat}
                            onChange={(event) => setForm({...form, repeat: event.target.value as ReminderRepeat})}
                        >
                            <option value='Never'>{'Never'}</option>
                            <option value='Daily'>{'Daily'}</option>
                            <option value='Weekly'>{'Weekly'}</option>
                            <option value='Monthly'>{'Monthly'}</option>
                        </select>
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminReminders.form-audience'
                            defaultMessage='Audience'
                        />
                        <select
                            className='form-select'
                            value={form.audience}
                            onChange={(event) => setForm({...form, audience: event.target.value as ReminderAudience})}
                        >
                            <option value='All Users'>{'All Users'}</option>
                            <option value='SuperAdmin'>{'SuperAdmin'}</option>
                            <option value='PublicUser'>{'PublicUser'}</option>
                        </select>
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminReminders.form-channel'
                            defaultMessage='Channel'
                        />
                        <select
                            className='form-select'
                            value={form.channel}
                            onChange={(event) => setForm({...form, channel: event.target.value as ReminderChannel})}
                        >
                            <option value='In-app'>{'In-app'}</option>
                            <option value='Email'>{'Email'}</option>
                            <option value='WhatsApp'>{'WhatsApp'}</option>
                            <option value='Telegram'>{'Telegram'}</option>
                        </select>
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminReminders.form-status'
                            defaultMessage='Status'
                        />
                        <select
                            className='form-select'
                            value={form.status}
                            onChange={(event) => setForm({...form, status: event.target.value as ReminderStatus})}
                        >
                            <option value='Active'>{'Active'}</option>
                            <option value='Paused'>{'Paused'}</option>
                        </select>
                    </label>
                </AppModal>}

            {deleteTarget &&
                <RootPortal>
                    <Dialog
                        className='admin-reminder-dialog admin-delete-dialog'
                        size='small'
                        title={
                            <FormattedMessage
                                id='AdminReminders.delete-reminder-title'
                                defaultMessage='Delete Reminder'
                            />
                        }
                        onClose={() => setDeleteTarget(null)}
                    >
                        <div className='admin-delete-body'>
                            <p>
                                <FormattedMessage
                                    id='AdminReminders.delete-confirm'
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
                                        id='AdminReminders.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </button>
                                <button
                                    className='btn btn-danger'
                                    type='button'
                                    onClick={deleteReminder}
                                >
                                    <FormattedMessage
                                        id='AdminReminders.delete'
                                        defaultMessage='Delete'
                                    />
                                </button>
                            </div>
                        </div>
                    </Dialog>
                </RootPortal>}

            <TableModule
                className='admin-reminders-table-card'
                fileName='reminders'
                printTitle={intl.formatMessage({
                    id: 'AdminReminders.title',
                    defaultMessage: 'Reminders',
                })}
                toolbarLeft={(
                    <label className='admin-reminders-search'>
                        <div className='input-icon'>
                            <span className='input-icon-addon'>
                                <IconSearch size={18}/>
                            </span>
                            <input
                                aria-label={intl.formatMessage({
                                    id: 'AdminReminders.search',
                                    defaultMessage: 'Search',
                                })}
                                className='form-control'
                                placeholder={intl.formatMessage({
                                    id: 'AdminReminders.search-placeholder',
                                    defaultMessage: 'Search reminders',
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
                    <table className='table table-vcenter card-table admin-table admin-reminders-table'>
                        <thead>
                            <tr>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-title'
                                        defaultMessage='Reminder'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-audience'
                                        defaultMessage='Audience'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-channel'
                                        defaultMessage='Channel'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-schedule'
                                        defaultMessage='Schedule'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-status'
                                        defaultMessage='Status'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminReminders.table-actions'
                                        defaultMessage='Actions'
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReminders.map((reminder) => (
                                <tr key={reminder.id}>
                                    <td>
                                        <span className='admin-reminder-title-cell'>
                                            <span className='admin-reminder-icon'>
                                                <IconBellRinging size={18}/>
                                            </span>
                                            <span>
                                                <strong>{reminder.title}</strong>
                                                <small>{reminder.description || '-'}</small>
                                            </span>
                                        </span>
                                    </td>
                                    <td>{reminder.audience}</td>
                                    <td>{reminder.channel}</td>
                                    <td>
                                        <span className='admin-reminder-schedule'>
                                            <strong>{formatReminderDate(reminder.remindAt)}</strong>
                                            <small>{reminder.repeat}</small>
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${reminder.status === 'Active' ? 'bg-green-lt' : 'bg-secondary-lt'}`}>
                                            {reminder.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className='admin-table-actions'>
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminReminders.edit-reminder',
                                                    defaultMessage: 'Edit reminder',
                                                })}
                                                className='btn btn-icon btn-outline-secondary'
                                                title={intl.formatMessage({
                                                    id: 'AdminReminders.edit-reminder',
                                                    defaultMessage: 'Edit reminder',
                                                })}
                                                type='button'
                                                onClick={() => startEditReminder(reminder)}
                                            >
                                                <IconEdit
                                                    className='icon'
                                                    size={18}
                                                />
                                            </button>
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminReminders.delete-reminder',
                                                    defaultMessage: 'Delete reminder',
                                                })}
                                                className='btn btn-icon btn-outline-danger'
                                                title={intl.formatMessage({
                                                    id: 'AdminReminders.delete-reminder',
                                                    defaultMessage: 'Delete reminder',
                                                })}
                                                type='button'
                                                onClick={() => setDeleteTarget(reminder)}
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
                    {filteredReminders.length === 0 &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='AdminReminders.empty'
                                defaultMessage='No reminders found.'
                            />
                        </div>}
                </div>
                {filteredReminders.length > 0 &&
                    <div className='card-footer admin-users-pagination'>
                        <div className='admin-users-pagination-inner'>
                            <span className='text-secondary admin-users-pagination-summary'>
                                <FormattedMessage
                                    id='AdminReminders.pagination-summary'
                                    defaultMessage='Page {page}'
                                    values={{page: currentPage}}
                                />
                            </span>
                            <ul className='pagination m-0'>
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'AdminReminders.previous-page',
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
                                            id: 'AdminReminders.next-page',
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

export default React.memo(AdminReminders)
