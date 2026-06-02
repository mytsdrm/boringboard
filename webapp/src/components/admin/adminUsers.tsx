// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import octoClient, {AdminUserPayload} from '../../octoClient'
import {useAppSelector} from '../../store/hooks'
import {getMe} from '../../store/users'
import {IUser} from '../../user'
import CompassIcon from '../../widgets/icons/compassIcon'

import './adminPages.scss'

type UserGroup = AdminUserPayload['group']

type UserFormState = {
    id: string
    username: string
    email: string
    password: string
    group: UserGroup
}

const emptyForm: UserFormState = {
    email: '',
    group: 'PublicUser',
    id: '',
    password: '',
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
    const [form, setForm] = useState<UserFormState>(emptyForm)
    const [showForm, setShowForm] = useState(false)
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
        return [...users].
            filter((user) => groupFilter === 'All' || getUserGroup(user) === groupFilter).
            sort((a, b) => a.username.localeCompare(b.username))
    }, [groupFilter, users])

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
            password: '',
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

    const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSaving(true)
        setError('')

        const payload: AdminUserPayload = {
            email: form.email.trim(),
            group: form.group,
            password: form.password,
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

    const deleteUser = async (user: IUser) => {
        // eslint-disable-next-line no-alert
        const confirmed = window.confirm(intl.formatMessage({
            id: 'AdminUsers.delete-confirm',
            defaultMessage: 'Delete this user and all related data?',
        }))
        if (!confirmed) {
            return
        }

        const deleted = await octoClient.deleteAdminUser(user.id)
        if (!deleted) {
            setError(intl.formatMessage({
                id: 'AdminUsers.delete-error',
                defaultMessage: 'Unable to delete user.',
            }))
            return
        }
        await loadUsers()
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
        <div className='AdminPage'>
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
                        <FormattedMessage
                            id='AdminUsers.filter-group'
                            defaultMessage='Group'
                        />
                        <select
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
                        type='button'
                        onClick={startAddUser}
                    >
                        <FormattedMessage
                            id='AdminUsers.add-user'
                            defaultMessage='Add User'
                        />
                    </button>
                </div>
            </div>
            {showForm &&
                <section className='admin-page-card admin-user-form-card'>
                    <form
                        className='admin-user-form'
                        onSubmit={saveUser}
                    >
                        <label>
                            <FormattedMessage
                                id='AdminUsers.form-username'
                                defaultMessage='Username'
                            />
                            <input
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
                                type='email'
                                value={form.email}
                                onChange={(event) => setForm({...form, email: event.target.value})}
                            />
                        </label>
                        <label>
                            <FormattedMessage
                                id='AdminUsers.form-password'
                                defaultMessage='Password'
                            />
                            <input
                                required={!form.id}
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
                        <div className='admin-form-actions'>
                            <button
                                type='button'
                                onClick={closeForm}
                            >
                                <FormattedMessage
                                    id='AdminUsers.cancel'
                                    defaultMessage='Cancel'
                                />
                            </button>
                            <button
                                disabled={isSaving}
                                type='submit'
                            >
                                <FormattedMessage
                                    id='AdminUsers.save'
                                    defaultMessage='Save'
                                />
                            </button>
                        </div>
                    </form>
                </section>}
            <section className='admin-page-card'>
                <div className='admin-table-scroll'>
                    <table className='admin-table'>
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
                            {sortedUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <span className='admin-user-cell'>
                                            <span className='admin-user-avatar'>
                                                <CompassIcon icon='account-outline'/>
                                            </span>
                                            {user.username}
                                        </span>
                                    </td>
                                    <td>{user.email || '-'}</td>
                                    <td>{getUserGroup(user)}</td>
                                    <td>{formatDate(user.create_at)}</td>
                                    <td>
                                        <div className='admin-table-actions'>
                                            <button
                                                type='button'
                                                onClick={() => startEditUser(user)}
                                            >
                                                <FormattedMessage
                                                    id='AdminUsers.edit'
                                                    defaultMessage='Edit'
                                                />
                                            </button>
                                            <button
                                                disabled={user.id === me?.id}
                                                type='button'
                                                onClick={() => deleteUser(user)}
                                            >
                                                <FormattedMessage
                                                    id='AdminUsers.delete'
                                                    defaultMessage='Delete'
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
            </section>
        </div>
    )
}

export default React.memo(AdminUsers)
