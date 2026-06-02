// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Constants} from '../../constants'
import {IUser} from '../../user'
import {BRANDING_UPDATED_EVENT, getStoredBranding, SystemBranding} from '../../branding'
import FocalboardLogoIcon from '../../widgets/icons/focalboard_logo'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {getMe} from '../../store/users'
import {useAppSelector} from '../../store/hooks'

import ModalWrapper from '../modalWrapper'
import Dialog from '../dialog'

import RegistrationLink from './registrationLink'

import './sidebarUserMenu.scss'

const SidebarUserMenu = () => {
    const [showRegistrationLinkDialog, setShowRegistrationLinkDialog] = useState(false)
    const [showAboutDialog, setShowAboutDialog] = useState(false)
    const [branding, setBranding] = useState<SystemBranding>(getStoredBranding)
    const user = useAppSelector<IUser|null>(getMe)
    const intl = useIntl()

    useEffect(() => {
        const handleBrandingUpdated = (event: Event) => {
            setBranding((event as CustomEvent<SystemBranding>).detail || getStoredBranding())
        }

        window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated)
        return () => {
            window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated)
        }
    }, [])

    return (
        <div className='SidebarUserMenu'>
            <ModalWrapper>
                <MenuWrapper>
                    <div className='logo'>
                        <div className='logo-title'>
                            {branding.logo ? (
                                <img
                                    className='brand-logo'
                                    src={branding.logo}
                                    alt={branding.appName}
                                />
                            ) : (
                                <FocalboardLogoIcon/>
                            )}
                            <span className='brand-name'>
                                {branding.appName}
                            </span>
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
                        title={(
                            <FormattedMessage
                                id='Sidebar.about'
                                defaultMessage='About BoringBoard'
                            />
                        )}
                        onClose={() => setShowAboutDialog(false)}
                    >
                        <div className='about-boringboard'>
                            <img
                                src={branding.logo}
                                alt={branding.appName}
                            />
                            <p>
                                <FormattedMessage
                                    id='Sidebar.about-description'
                                    defaultMessage='This is BoringBoard, yes its customized for my own project management workflow.'
                                />
                            </p>
                            <p>
                                <FormattedMessage
                                    id='Sidebar.about-fork-description'
                                    defaultMessage='This personal fork keeps the core board experience while adjusting the interface and branding for daily personal use.'
                                />
                            </p>
                            <a
                                className='about-source'
                                href='https://github.com/mytsdrm/boringboard'
                                target='_blank'
                                rel='noreferrer'
                            >
                                <FormattedMessage
                                    id='Sidebar.about-source'
                                    defaultMessage='Source: github.com/mytsdrm/boringboard'
                                />
                            </a>
                            <div className='about-version'>
                                <FormattedMessage
                                    id='Sidebar.about-version'
                                    defaultMessage='Version {version}'
                                    values={{version: Constants.versionString}}
                                />
                            </div>
                        </div>
                    </Dialog>
                }
            </ModalWrapper>
        </div>
    )
}

export default React.memo(SidebarUserMenu)
