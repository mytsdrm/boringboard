// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react'
import {useIntl} from 'react-intl'
import {useHistory} from 'react-router-dom'

import {Constants} from '../../constants'
import octoClient from '../../octoClient'
import {IUser} from '../../user'
import FocalboardLogoIcon from '../../widgets/icons/focalboard_logo'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {getMe, setMe} from '../../store/users'
import {useAppSelector, useAppDispatch} from '../../store/hooks'

import ModalWrapper from '../modalWrapper'
import Dialog from '../dialog'

import RegistrationLink from './registrationLink'

import './sidebarUserMenu.scss'

const SidebarUserMenu = () => {
    const dispatch = useAppDispatch()
    const history = useHistory()
    const [showRegistrationLinkDialog, setShowRegistrationLinkDialog] = useState(false)
    const [showAboutDialog, setShowAboutDialog] = useState(false)
    const user = useAppSelector<IUser|null>(getMe)
    const intl = useIntl()

    return (
        <div className='SidebarUserMenu'>
            <ModalWrapper>
                <MenuWrapper>
                    <div className='logo'>
                        <div className='logo-title'>
                            <FocalboardLogoIcon/>
                            <span>{'BoringBoard'}</span>
                            <div className='versionFrame'>
                                <div
                                    className='version'
                                    title={`v${Constants.versionString}`}
                                >
                                    {`v${Constants.versionString}`}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Menu>
                        {user && user.username !== 'single-user' && <>
                            <Menu.Label><b>{user.username}</b></Menu.Label>
                            <Menu.Text
                                id='logout'
                                name={intl.formatMessage({id: 'Sidebar.logout', defaultMessage: 'Log out'})}
                                onClick={async () => {
                                    await octoClient.logout()
                                    dispatch(setMe(null))
                                    history.push('/login')
                                }}
                            />
                            <Menu.Text
                                id='changePassword'
                                name={intl.formatMessage({id: 'Sidebar.changePassword', defaultMessage: 'Change password'})}
                                onClick={async () => {
                                    history.push('/change_password')
                                }}
                            />
                            <Menu.Text
                                id='invite'
                                name={intl.formatMessage({id: 'Sidebar.invite-users', defaultMessage: 'Invite users'})}
                                onClick={async () => {
                                    setShowRegistrationLinkDialog(true)
                                }}
                            />

                            <Menu.Separator/>
                        </>}

                        <Menu.Text
                            id='about'
                            name={intl.formatMessage({id: 'Sidebar.about', defaultMessage: 'About BoringBoard'})}
                            onClick={async () => {
                                setShowAboutDialog(true)
                            }}
                        />
                    </Menu>
                </MenuWrapper>

                {showRegistrationLinkDialog &&
                    <RegistrationLink
                        onClose={() => {
                            setShowRegistrationLinkDialog(false)
                        }}
                    />
                }

                {showAboutDialog &&
                    <Dialog
                        size='small'
                        className='AboutBoringBoardDialog'
                        title={<>{'About BoringBoard'}</>}
                        onClose={() => setShowAboutDialog(false)}
                    >
                        <div className='about-boringboard'>
                            <img
                                src='/static/boringboard-logo.webp'
                                alt='BoringBoard'
                            />
                            <p>
                                {'BoringBoard is a personal fork of Focalboard, customized for my own project management workflow.'}
                            </p>
                            <p>
                                {'The original project is Focalboard by Mattermost. This fork keeps the core board experience while adjusting the interface and branding for personal use.'}
                            </p>
                            <div className='about-version'>
                                {`Version ${Constants.versionString}`}
                            </div>
                        </div>
                    </Dialog>
                }
            </ModalWrapper>
        </div>
    )
}

export default React.memo(SidebarUserMenu)
