// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link, Redirect, useLocation, useHistory} from 'react-router-dom'
import {FormattedMessage, useIntl} from 'react-intl'

import {useAppDispatch, useAppSelector} from '../store/hooks'
import {fetchMe, getLoggedIn} from '../store/users'

import Button from '../widgets/buttons/button'
import IconButton from '../widgets/buttons/iconButton'
import HideIcon from '../widgets/icons/hide'
import ShowIcon from '../widgets/icons/show'
import client from '../octoClient'
import './loginPage.scss'

const LoginPage = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const dispatch = useAppDispatch()
    const loggedIn = useAppSelector<boolean|null>(getLoggedIn)
    const queryParams = new URLSearchParams(useLocation().search)
    const history = useHistory()
    const intl = useIntl()

    const handleLogin = async (): Promise<void> => {
        const trimmedUsername = username.trim()
        if (!trimmedUsername && !password) {
            setErrorMessage(intl.formatMessage({id: 'login.error-missing-username-password', defaultMessage: 'Please enter your username and password.'}))
            return
        }
        if (!trimmedUsername) {
            setErrorMessage(intl.formatMessage({id: 'login.error-missing-username', defaultMessage: 'Please enter your username.'}))
            return
        }
        if (!password) {
            setErrorMessage(intl.formatMessage({id: 'login.error-missing-password', defaultMessage: 'Please enter your password.'}))
            return
        }

        const logged = await client.login(trimmedUsername, password)
        if (logged) {
            await dispatch(fetchMe())
            if (queryParams) {
                history.push(queryParams.get('r') || '/')
            } else {
                history.push('/')
            }
        } else {
            setErrorMessage(intl.formatMessage({id: 'login.error-invalid-credentials', defaultMessage: 'Username or password is incorrect.'}))
        }
    }

    if (loggedIn) {
        return <Redirect to={'/'}/>
    }

    return (
        <div className='LoginPage'>
            <form
                onSubmit={(e: React.FormEvent) => {
                    e.preventDefault()
                    handleLogin()
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
                <div className='username'>
                    <label htmlFor='login-username'>
                        <FormattedMessage
                            id='login.username-label'
                            defaultMessage='Username'
                        />
                    </label>
                    <input
                        id='login-username'
                        placeholder={intl.formatMessage({id: 'login.username-placeholder', defaultMessage: 'Enter your username'})}
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value)
                            setErrorMessage('')
                        }}
                    />
                </div>
                <div className='password'>
                    <label htmlFor='login-password'>
                        <FormattedMessage
                            id='login.password-label'
                            defaultMessage='Password'
                        />
                    </label>
                    <div className='passwordField'>
                        <input
                            id='login-password'
                            type={showPassword ? 'text' : 'password'}
                            placeholder={intl.formatMessage({id: 'login.password-placeholder', defaultMessage: 'Enter your password'})}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setErrorMessage('')
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showPassword ? intl.formatMessage({id: 'login.hide-password', defaultMessage: 'Hide password'}) : intl.formatMessage({id: 'login.show-password', defaultMessage: 'Show password'})}
                            icon={showPassword ? <HideIcon/> : <ShowIcon/>}
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    </div>
                </div>
                <Button
                    filled={true}
                    submit={true}
                >
                    <FormattedMessage
                        id='login.log-in-button'
                        defaultMessage='Log in'
                    />
                </Button>
                <Link to='/register'>
                    <FormattedMessage
                        id='login.register-button'
                        defaultMessage={'Create an account'}
                    />
                </Link>
            </form>
        </div>
    )
}

export default React.memo(LoginPage)
