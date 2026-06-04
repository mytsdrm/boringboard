// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'
import {IconBrandTelegram, IconBrandWhatsapp, IconChevronLeft, IconChevronRight, IconEdit, IconPlus, IconSearch, IconShieldLock, IconTrash, IconUserCircle} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'

import octoClient, {AdminUserPayload} from '../../octoClient'
import {useAppSelector} from '../../store/hooks'
import {getMe} from '../../store/users'
import {IUser} from '../../user'
import AppModal from '../appModal'
import Dialog from '../dialog'
import RootPortal from '../rootPortal'
import TableModule from '../tableModule/tableModule'

import '@tabler/core/dist/css/tabler.min.css'
import './adminPages.scss'

type UserGroup = AdminUserPayload['group']

const USER_PAGE_SIZE = 10

type UserFormState = {
    id: string
    username: string
    email: string
    nickname: string
    phoneNumber: string
    phoneWhatsAppEnabled: boolean
    phoneTelegramEnabled: boolean
    password: string
    group: UserGroup
}

const emptyForm: UserFormState = {
    email: '',
    group: 'PublicUser',
    id: '',
    nickname: '',
    password: '',
    phoneNumber: '',
    phoneTelegramEnabled: false,
    phoneWhatsAppEnabled: false,
    username: '',
}

const getUserGroup = (user: IUser): UserGroup => {
    return user.roles?.includes('SuperAdmin') || user.roles?.includes('system_admin') ? 'SuperAdmin' : 'PublicUser'
}

const AdminUsers = (): JSX.Element => {
    const intl = useIntl()
    const me = useAppSelector<IUser|null>(getMe)
    const [users, setUsers] = useState<IUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [groupFilter, setGroupFilter] = useState<UserGroup | 'All'>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [form, setForm] = useState<UserFormState>(emptyForm)
    const [showForm, setShowForm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<IUser | null>(null)
    const [error, setError] = useState('')

    const loadUsers = async () => {
        setIsLoading(true)
        const nextUsers = await octoClient.getAdminUsers()
        setUsers(nextUsers)
        setIsLoading(false)
    }

    useEffect(() => {
        let canceled = false
        async function load() {
            setIsLoading(true)
            const nextUsers = await octoClient.getAdminUsers()
            if (!canceled) {
                setUsers(nextUsers)
                setIsLoading(false)
            }
        }
        load()
        return () => {
            canceled = true
        }
    }, [])

    const sortedUsers = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase()

        return [...users].
            filter((user) => groupFilter === 'All' || getUserGroup(user) === groupFilter).
            filter((user) => {
                if (!normalizedSearch) {
                    return true
                }

                const searchableText = [
                    user.username,
                    user.email,
                    user.nickname,
                    user.phoneNumber,
                    getUserGroup(user),
                ].join(' ').toLowerCase()

                return searchableText.includes(normalizedSearch)
            }).
            sort((a, b) => a.username.localeCompare(b.username))
    }, [groupFilter, searchQuery, users])
    const totalPages = Math.max(1, Math.ceil(sortedUsers.length / USER_PAGE_SIZE))
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USER_PAGE_SIZE
        return sortedUsers.slice(startIndex, startIndex + USER_PAGE_SIZE)
    }, [currentPage, sortedUsers])
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
    }, [groupFilter, searchQuery])

    useEffect(() => {
        setCurrentPage((previousPage) => Math.min(previousPage, totalPages))
    }, [totalPages])

    const startAddUser = () => {
        setForm(emptyForm)
        setError('')
        setShowForm(true)
    }

    const startEditUser = (user: IUser) => {
        setForm({
            email: user.email || '',
            group: getUserGroup(user),
            id: user.id,
            nickname: user.nickname || '',
            password: '',
            phoneNumber: user.phoneNumber || '',
            phoneTelegramEnabled: user.phoneTelegramEnabled || false,
            phoneWhatsAppEnabled: user.phoneWhatsAppEnabled || false,
            username: user.username,
        })
        setError('')
        setShowForm(true)
    }

    const closeForm = () => {
        setForm(emptyForm)
        setError('')
        setShowForm(false)
    }

    const openDeleteModal = (user: IUser) => {
        setDeleteTarget(user)
        setError('')
    }

    const closeDeleteModal = () => {
        setDeleteTarget(null)
        setError('')
    }

    const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSaving(true)
        setError('')

        const payload: AdminUserPayload = {
            email: form.email.trim(),
            group: form.group,
            nickname: form.nickname.trim(),
            password: form.password,
            phoneNumber: form.phoneNumber.trim(),
            phoneTelegramEnabled: form.phoneTelegramEnabled,
            phoneWhatsAppEnabled: form.phoneWhatsAppEnabled,
            username: form.username.trim(),
        }

        const savedUser = form.id ?
            await octoClient.updateAdminUser(form.id, payload) :
            await octoClient.createAdminUser(payload)

        if (!savedUser) {
            setError(intl.formatMessage({
                id: 'AdminUsers.save-error',
                defaultMessage: 'Unable to save user.',
            }))
            setIsSaving(false)
            return
        }

        await loadUsers()
        closeForm()
        setIsSaving(false)
    }

    const deleteUser = async () => {
        if (!deleteTarget) {
            return
        }

        setIsSaving(true)
        const deleted = await octoClient.deleteAdminUser(deleteTarget.id)
        if (!deleted) {
            setError(intl.formatMessage({
                id: 'AdminUsers.delete-error',
                defaultMessage: 'Unable to delete user.',
            }))
            setIsSaving(false)
            return
        }
        await loadUsers()
        closeDeleteModal()
        setIsSaving(false)
    }

    const formatDate = (timestamp: number): string => {
        if (!timestamp) {
            return '-'
        }
        return intl.formatDate(timestamp, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
    }

    return (
        <div className='AdminPage admin-users-page'>
            <div className='admin-page-header admin-page-header-row'>
                <div>
                    <div className='admin-page-eyebrow'>
                        <FormattedMessage
                            id='AdminUsers.eyebrow'
                            defaultMessage='Users'
                        />
                    </div>
                    <h1>
                        <FormattedMessage
                            id='AdminUsers.title'
                            defaultMessage='Registered users'
                        />
                    </h1>
                </div>
                <div className='admin-header-actions'>
                    <label>
                        <select
                            aria-label={intl.formatMessage({
                                id: 'AdminUsers.filter-group',
                                defaultMessage: 'Group',
                            })}
                            className='form-select'
                            value={groupFilter}
                            onChange={(event) => setGroupFilter(event.target.value as UserGroup | 'All')}
                        >
                            <option value='All'>
                                {intl.formatMessage({id: 'AdminUsers.filter-all', defaultMessage: 'All'})}
                            </option>
                            <option value='SuperAdmin'>{'SuperAdmin'}</option>
                            <option value='PublicUser'>{'PublicUser'}</option>
                        </select>
                    </label>
                    <button
                        className='btn btn-primary'
                        type='button'
                        onClick={startAddUser}
                    >
                        <IconPlus
                            className='icon'
                            size={18}
                        />
                        <FormattedMessage
                            id='AdminUsers.add-user'
                            defaultMessage='Add User'
                        />
                    </button>
                </div>
            </div>
            {showForm &&
                <AppModal
                    bodyClassName='admin-user-form'
                    cancelText={(
                        <FormattedMessage
                            id='AdminUsers.cancel'
                            defaultMessage='Cancel'
                        />
                    )}
                    className='admin-user-dialog'
                    saveDisabled={isSaving}
                    saveText={(
                        <FormattedMessage
                            id='AdminUsers.save'
                            defaultMessage='Save'
                        />
                    )}
                    title={
                        form.id ? (
                            <FormattedMessage
                                id='AdminUsers.edit-user-title'
                                defaultMessage='Edit User'
                            />
                        ) : (
                            <FormattedMessage
                                id='AdminUsers.add-user-title'
                                defaultMessage='Add User'
                            />
                        )
                    }
                    titleIcon={<IconUserCircle size={20}/>}
                    onClose={closeForm}
                    onSubmit={saveUser}
                >
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-username'
                            defaultMessage='Username'
                        />
                        <input
                            className='form-control'
                            required={true}
                            value={form.username}
                            onChange={(event) => setForm({...form, username: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-email'
                            defaultMessage='Email'
                        />
                        <input
                            className='form-control'
                            type='email'
                            value={form.email}
                            onChange={(event) => setForm({...form, email: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-display-name'
                            defaultMessage='Display name'
                        />
                        <input
                            className='form-control'
                            value={form.nickname}
                            onChange={(event) => setForm({...form, nickname: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-phone-number'
                            defaultMessage='Phone Number'
                        />
                        <input
                            className='form-control'
                            inputMode='tel'
                            type='tel'
                            value={form.phoneNumber}
                            onChange={(event) => setForm({...form, phoneNumber: event.target.value})}
                        />
                    </label>
                    <label className='admin-user-checkbox'>
                        <input
                            checked={form.phoneWhatsAppEnabled}
                            type='checkbox'
                            onChange={(event) => setForm({...form, phoneWhatsAppEnabled: event.target.checked})}
                        />
                        <FormattedMessage
                            id='AdminUsers.form-whatsapp'
                            defaultMessage='WhatsApp'
                        />
                    </label>
                    <label className='admin-user-checkbox'>
                        <input
                            checked={form.phoneTelegramEnabled}
                            type='checkbox'
                            onChange={(event) => setForm({...form, phoneTelegramEnabled: event.target.checked})}
                        />
                        <FormattedMessage
                            id='AdminUsers.form-telegram'
                            defaultMessage='Telegram'
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-password'
                            defaultMessage='Password'
                        />
                        <input
                            className='form-control'
                            required={!form.id}
                            placeholder={form.id ? intl.formatMessage({
                                id: 'AdminUsers.password-unchanged',
                                defaultMessage: 'Leave blank to keep current password',
                            }) : undefined}
                            type='password'
                            value={form.password}
                            onChange={(event) => setForm({...form, password: event.target.value})}
                        />
                    </label>
                    <label>
                        <FormattedMessage
                            id='AdminUsers.form-group'
                            defaultMessage='Group'
                        />
                        <select
                            className='form-select'
                            value={form.group}
                            onChange={(event) => setForm({...form, group: event.target.value as UserGroup})}
                        >
                            <option value='PublicUser'>{'PublicUser'}</option>
                            <option value='SuperAdmin'>{'SuperAdmin'}</option>
                        </select>
                    </label>
                    {error &&
                        <div className='admin-form-error'>
                            {error}
                        </div>}
                </AppModal>}
            {deleteTarget &&
                <RootPortal>
                    <Dialog
                        className='admin-user-dialog admin-delete-dialog'
                        size='small'
                        title={
                            <FormattedMessage
                                id='AdminUsers.delete-user-title'
                                defaultMessage='Delete User'
                            />
                        }
                        onClose={closeDeleteModal}
                    >
                        <div className='admin-delete-body'>
                            <p>
                                <FormattedMessage
                                    id='AdminUsers.delete-confirm'
                                    defaultMessage='Delete {username} and all related data?'
                                    values={{username: deleteTarget.username}}
                                />
                            </p>
                            {error &&
                                <div className='admin-form-error'>
                                    {error}
                                </div>}
                            <div className='admin-form-actions'>
                                <button
                                    className='btn btn-outline-secondary'
                                    type='button'
                                    onClick={closeDeleteModal}
                                >
                                    <FormattedMessage
                                        id='AdminUsers.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </button>
                                <button
                                    className='btn btn-danger'
                                    disabled={isSaving}
                                    type='button'
                                    onClick={deleteUser}
                                >
                                    <FormattedMessage
                                        id='AdminUsers.delete'
                                        defaultMessage='Delete'
                                    />
                                </button>
                            </div>
                        </div>
                    </Dialog>
                </RootPortal>}
            <TableModule
                className='admin-users-table-card'
                fileName='registered-users'
                printTitle={intl.formatMessage({
                    id: 'AdminUsers.title',
                    defaultMessage: 'Registered users',
                })}
                toolbarLeft={(
                    <label className='admin-users-search'>
                        <div className='input-icon'>
                            <span className='input-icon-addon'>
                                <IconSearch size={18}/>
                            </span>
                            <input
                                aria-label={intl.formatMessage({
                                    id: 'AdminUsers.search',
                                    defaultMessage: 'Search',
                                })}
                                className='form-control'
                                placeholder={intl.formatMessage({
                                    id: 'AdminUsers.search-placeholder',
                                    defaultMessage: 'Search users',
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
                    <table className='table table-vcenter card-table admin-table'>
                        <thead>
                            <tr>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.username'
                                        defaultMessage='Username'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.email'
                                        defaultMessage='Email'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.phone-number'
                                        defaultMessage='Phone Number'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.group'
                                        defaultMessage='Group'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.created'
                                        defaultMessage='Created'
                                    />
                                </th>
                                <th>
                                    <FormattedMessage
                                        id='AdminUsers.actions'
                                        defaultMessage='Actions'
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <span className='admin-user-cell'>
                                            <span className='admin-user-avatar'>
                                                <IconUserCircle size={18}/>
                                            </span>
                                            {user.username}
                                        </span>
                                    </td>
                                    <td>{user.email || '-'}</td>
                                    <td>
                                        {user.phoneNumber ? (
                                            <span className='admin-user-phone'>
                                                <span>{user.phoneNumber}</span>
                                                <span className='admin-user-phone-channels'>
                                                    {user.phoneWhatsAppEnabled &&
                                                        <span
                                                            aria-label='WhatsApp'
                                                            className='whatsapp'
                                                            title='WhatsApp'
                                                        >
                                                            <IconBrandWhatsapp size={14}/>
                                                        </span>}
                                                    {user.phoneTelegramEnabled &&
                                                        <span
                                                            aria-label='Telegram'
                                                            className='telegram'
                                                            title='Telegram'
                                                        >
                                                            <IconBrandTelegram size={14}/>
                                                        </span>}
                                                </span>
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span className={`badge ${getUserGroup(user) === 'SuperAdmin' ? 'bg-blue-lt' : 'bg-secondary-lt'}`}>
                                            {getUserGroup(user) === 'SuperAdmin' &&
                                                <IconShieldLock
                                                    className='icon'
                                                    size={14}
                                                />}
                                            {getUserGroup(user)}
                                        </span>
                                    </td>
                                    <td>{formatDate(user.create_at)}</td>
                                    <td>
                                        <div className='admin-table-actions'>
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminUsers.edit-user',
                                                    defaultMessage: 'Edit user',
                                                })}
                                                className='btn btn-icon btn-outline-secondary'
                                                title={intl.formatMessage({
                                                    id: 'AdminUsers.edit-user',
                                                    defaultMessage: 'Edit user',
                                                })}
                                                type='button'
                                                onClick={() => startEditUser(user)}
                                            >
                                                <IconEdit
                                                    className='icon'
                                                    size={18}
                                                />
                                            </button>
                                            <button
                                                aria-label={intl.formatMessage({
                                                    id: 'AdminUsers.delete-user',
                                                    defaultMessage: 'Delete user',
                                                })}
                                                className='btn btn-icon btn-outline-danger'
                                                disabled={user.id === me?.id}
                                                title={intl.formatMessage({
                                                    id: 'AdminUsers.delete-user',
                                                    defaultMessage: 'Delete user',
                                                })}
                                                type='button'
                                                onClick={() => openDeleteModal(user)}
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
                    {!isLoading && sortedUsers.length === 0 &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='AdminUsers.empty'
                                defaultMessage='No registered users found.'
                            />
                        </div>}
                    {isLoading &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='AdminUsers.loading'
                                defaultMessage='Loading users...'
                            />
                        </div>}
                </div>
                {!isLoading && sortedUsers.length > 0 &&
                    <div className='card-footer admin-users-pagination'>
                        <div className='admin-users-pagination-inner'>
                            <span className='text-secondary admin-users-pagination-summary'>
                                <FormattedMessage
                                    id='AdminUsers.pagination-summary'
                                    defaultMessage='Page {page}'
                                    values={{
                                        page: currentPage,
                                    }}
                                />
                            </span>
                            <ul className='pagination m-0'>
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'AdminUsers.previous-page',
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
                                            id: 'AdminUsers.next-page',
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

export default React.memo(AdminUsers)
