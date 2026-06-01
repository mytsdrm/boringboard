// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link} from 'react-router-dom'

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
                    <div className='title'>{'Change password'}</div>
                    <Link to='/login'>{'Log in first'}</Link>
                </div>
            </div>
        )
    }

    const handleSubmit = async (userId: string): Promise<void> => {
        if (!oldPassword && !newPassword) {
            setErrorMessage('Please enter your current and new password.')
            return
        }
        if (!oldPassword) {
            setErrorMessage('Please enter your current password.')
            return
        }
        if (!newPassword) {
            setErrorMessage('Please enter your new password.')
            return
        }

        const response = await client.changePassword(userId, oldPassword, newPassword)
        if (response.code === 200) {
            setOldPassword('')
            setNewPassword('')
            setErrorMessage('')
            setSucceeded(true)
        } else {
            setErrorMessage(`Change password failed: ${response.json?.error}`)
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
                    >{'Password changed. Continue to BoringBoard.'}</Link>
                }
                <div className='title'>{'Change password'}</div>
                <div className='oldPassword'>
                    <label htmlFor='login-oldpassword'>{'Current password'}</label>
                    <div className='passwordField'>
                        <input
                            id='login-oldpassword'
                            type={showOldPassword ? 'text' : 'password'}
                            placeholder={'Enter current password'}
                            value={oldPassword}
                            onChange={(e) => {
                                setOldPassword(e.target.value)
                                setErrorMessage('')
                                setSucceeded(false)
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showOldPassword ? 'Hide password' : 'Show password'}
                            icon={showOldPassword ? <HideIcon/> : <ShowIcon/>}
                            onClick={() => setShowOldPassword(!showOldPassword)}
                        />
                    </div>
                </div>
                <div className='newPassword'>
                    <label htmlFor='login-newpassword'>{'New password'}</label>
                    <div className='passwordField'>
                        <input
                            id='login-newpassword'
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={'Enter new password'}
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value)
                                setErrorMessage('')
                                setSucceeded(false)
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showNewPassword ? 'Hide password' : 'Show password'}
                            icon={showNewPassword ? <HideIcon/> : <ShowIcon/>}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        />
                    </div>
                </div>
                <Button
                    filled={true}
                    submit={true}
                >
                    {'Change password'}
                </Button>
                {!succeeded &&
                    <Link to='/'>{'Cancel'}</Link>
                }
            </form>
        </div>
    )
}

export default React.memo(ChangePasswordPage)
