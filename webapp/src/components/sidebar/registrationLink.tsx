// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {sendFlashMessage} from '../flashMessages'
import {Utils} from '../../utils'
import Button from '../../widgets/buttons/button'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeam, Team, refreshCurrentTeam, regenerateSignupToken} from '../../store/teams'

import AppModal from '../appModal'

import './registrationLink.scss'

type Props = {
    onClose: () => void
}

const RegistrationLink = (props: Props) => {
    const {onClose} = props
    const intl = useIntl()

    const team = useAppSelector<Team|null>(getCurrentTeam)
    const signupToken = team?.signupToken
    const dispatch = useAppDispatch()

    const [wasCopied, setWasCopied] = useState(false)

    useEffect(() => {
        /* dispatch(fetchWorkspace()) */
    }, [])

    const regenerateToken = async () => {
        // eslint-disable-next-line no-alert
        const accept = window.confirm(intl.formatMessage({id: 'RegistrationLink.confirmRegenerateToken', defaultMessage: 'This will invalidate previously shared links. Continue?'}))
        if (accept) {
            await dispatch(regenerateSignupToken())
            await dispatch(refreshCurrentTeam())
            setWasCopied(false)

            const description = intl.formatMessage({id: 'RegistrationLink.tokenRegenerated', defaultMessage: 'Registration link regenerated'})
            sendFlashMessage({content: description, severity: 'low'})
        }
    }

    const registrationUrl = `${Utils.getBaseURL(true).replace(/\/$/, '')}/register?t=${signupToken}`

    return (
        <AppModal
            className='RegistrationLinkDialog'
            title={(
                <FormattedMessage
                    id='Sidebar.invite-users'
                    defaultMessage='Invite users'
                />
            )}
            width='560px'
            footerContent={(
                <div className='invite-actions'>
                    <Button
                        className='invite-close-button'
                        onClick={onClose}
                        emphasis='secondary'
                        size='small'
                    >
                        <FormattedMessage
                            id='RegistrationLink.close'
                            defaultMessage='Close'
                        />
                    </Button>
                    <Button
                        onClick={regenerateToken}
                        emphasis='secondary'
                        size='small'
                    >
                        {intl.formatMessage({id: 'RegistrationLink.regenerateToken', defaultMessage: 'Regenerate token'})}
                    </Button>
                    <Button
                        filled={true}
                        size='small'
                        onClick={() => {
                            Utils.copyTextToClipboard(registrationUrl)
                            setWasCopied(true)
                        }}
                    >
                        {wasCopied ? intl.formatMessage({id: 'RegistrationLink.copiedLink', defaultMessage: 'Copied!'}) : intl.formatMessage({id: 'RegistrationLink.copyLink', defaultMessage: 'Copy link'})}
                    </Button>
                </div>
            )}
            onClose={onClose}
        >
            <div className='RegistrationLink'>
                {signupToken && <>
                    <div className='row description'>
                        {intl.formatMessage({id: 'RegistrationLink.description', defaultMessage: 'Share this link for others to create accounts:'})}
                    </div>
                    <div className='row invite-link-row'>
                        <a
                            className='shareUrl'
                            href={registrationUrl}
                            target='_blank'
                            rel='noreferrer'
                        >
                            {registrationUrl}
                        </a>
                    </div>
                </>}
                {!signupToken &&
                    <div className='row description'>
                        <FormattedMessage
                            id='RegistrationLink.noToken'
                            defaultMessage='Registration link is not available yet.'
                        />
                    </div>}
            </div>
        </AppModal>
    )
}

export default React.memo(RegistrationLink)
