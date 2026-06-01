// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link, Redirect, useLocation, useHistory} from 'react-router-dom'
import {FormattedMessage} from 'react-intl'

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

    const handleLogin = async (): Promise<void> => {
        const trimmedUsername = username.trim()
        if (!trimmedUsername && !password) {
            setErrorMessage('Please enter your username and password.')
            return
        }
        if (!trimmedUsername) {
            setErrorMessage('Please enter your username.')
            return
        }
        if (!password) {
            setErrorMessage('Please enter your password.')
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
            setErrorMessage('Username or password is incorrect.')
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
                    <label htmlFor='login-username'>{'Username'}</label>
                    <input
                        id='login-username'
                        placeholder={'Enter your username'}
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value)
                            setErrorMessage('')
                        }}
                    />
                </div>
                <div className='password'>
                    <label htmlFor='login-password'>{'Password'}</label>
                    <div className='passwordField'>
                        <input
                            id='login-password'
                            type={showPassword ? 'text' : 'password'}
                            placeholder={'Enter your password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setErrorMessage('')
                            }}
                        />
                        <IconButton
                            className='togglePassword'
                            title={showPassword ? 'Hide password' : 'Show password'}
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
