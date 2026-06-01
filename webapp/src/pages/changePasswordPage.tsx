// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link} from 'react-router-dom'
import {FormattedMessage, useIntl} from 'react-intl'

import Button from '../widgets/buttons/button'
import IconButton from '../widgets/buttons/iconButton'
import HideIcon from '../widgets/icons/hide'
import ShowIcon from '../widgets/icons/show'
import client from '../octoClient'
import './changePasswordPage.scss'
import {IUser} from '../user'
import {useAppSelector} from '../store/hooks'
import {getMe} from '../store/users'

const ChangePasswordPage = () => {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showOldPassword, setShowOldPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [succeeded, setSucceeded] = useState(false)
    const user = useAppSelector<IUser|null>(getMe)
    const intl = useIntl()

    if (!user) {
        return (
            <div className='ChangePasswordPage'>
                <div className='card'>
                    <div className='brand'>
                        <img
                            src='/static/boringboard-logo.webp'
                            alt='BoringBoard'
                        />
                    </div>
                    <div className='title'>
                        <FormattedMessage
                            id='changePassword.title'
                            defaultMessage='Change password'
                        />
                    </div>
                    <Link to='/login'>
                        <FormattedMessage
                            id='changePassword.login-first'
                            defaultMessage='Log in first'
                        />
                    </Link>
                </div>
            </div>
        )
    }

    const handleSubmit = async (userId: string): Promise<void> => {
        if (!oldPassword && !newPassword) {
            setErrorMessage(intl.formatMessage({id: 'changePassword.error-missing-current-new', defaultMessage: 'Please enter your current and new password.'}))
            return
        }
        if (!oldPassword) {
            setErrorMessage(intl.formatMessage({id: 'changePassword.error-missing-current', defaultMessage: 'Please enter your current password.'}))
            return
        }
        if (!newPassword) {
            setErrorMessage(intl.formatMessage({id: 'changePassword.error-missing-new', defaultMessage: 'Please enter your new password.'}))
            return
        }

        const response = await client.changePassword(userId, oldPassword, newPassword)
        if (response.code === 200) {
            setOldPassword('')
            setNewPassword('')
            setErrorMessage('')
            setSucceeded(true)
        } else {
            setErrorMessage(intl.formatMessage(
                {id: 'changePassword.error-failed', defaultMessage: 'Change password failed: {error}'},
                {error: response.json?.error},
            ))
        }
    }

    return (
        <div className='ChangePasswordPage'>
            <form
                onSubmit={(e: React.FormEvent) => {
                    e.preventDefault()
                    handleSubmit(user.id)
                }}
            >
                <div className='brand'>
                    <img
                        src='/static/boringboard-logo.webp'
                        alt='BoringBoard'
                    />
                </div>
                {errorMessage &&
                    <div className='error'>
                        {errorMessage}
                    </div>
                }
                {succeeded &&
                    <Link
                        className='succeeded'
                        to='/'
                    >
                        <FormattedMessage
                            id='changePassword.success'
                            defaultMessage='Password changed. Continue to BoringBoard.'
                        />
                    </Link>
                }
                <div className='title'>
                    <FormattedMessage
                        id='changePassword.title'
                        defaultMessage='Change password'
                    />
                </div>
                <div className='oldPassword'>
                    <label htmlFor='login-oldpassword'>
                        <FormattedMessage
                            id='changePassword.current-password-label'
                            defaultMessage='Current password'
                        />
                    </label>
                    <div className='passwordField'>
                        <input
                            id='login-oldpassword'
                            type={showOldPassword ? 'text' : 'password'}
                            placeholder={intl.formatMessage({id: 'changePassword.current-password-placeholder', defaultMessage: 'Enter current password'})}
                            value={oldPassword}
                            onChange={(e) => {
                                setOldPassword(e.target.value)
                                setErrorMessage('')
                                setSucceeded(false)
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showOldPassword ? intl.formatMessage({id: 'login.hide-password', defaultMessage: 'Hide password'}) : intl.formatMessage({id: 'login.show-password', defaultMessage: 'Show password'})}
                            icon={showOldPassword ? <HideIcon/> : <ShowIcon/>}
                            onClick={() => setShowOldPassword(!showOldPassword)}
                        />
                    </div>
                </div>
                <div className='newPassword'>
                    <label htmlFor='login-newpassword'>
                        <FormattedMessage
                            id='changePassword.new-password-label'
                            defaultMessage='New password'
                        />
                    </label>
                    <div className='passwordField'>
                        <input
                            id='login-newpassword'
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={intl.formatMessage({id: 'changePassword.new-password-placeholder', defaultMessage: 'Enter new password'})}
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value)
                                setErrorMessage('')
                                setSucceeded(false)
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showNewPassword ? intl.formatMessage({id: 'login.hide-password', defaultMessage: 'Hide password'}) : intl.formatMessage({id: 'login.show-password', defaultMessage: 'Show password'})}
                            icon={showNewPassword ? <HideIcon/> : <ShowIcon/>}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        />
                    </div>
                </div>
                <Button
                    filled={true}
                    submit={true}
                >
                    <FormattedMessage
                        id='changePassword.submit-button'
                        defaultMessage='Change password'
                    />
                </Button>
                {!succeeded &&
                    <Link to='/'>
                        <FormattedMessage
                            id='changePassword.cancel'
                            defaultMessage='Cancel'
                        />
                    </Link>
                }
            </form>
        </div>
    )
}

export default React.memo(ChangePasswordPage)
