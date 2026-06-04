// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {IconCheck, IconInfoCircle, IconX} from '@tabler/icons-react'

import Dialog from './dialog'
import RootPortal from './rootPortal'

import './appModal.scss'

type AppModalStyle = React.CSSProperties & {
    '--app-modal-width'?: string
}

type Props = {
    children: React.ReactNode
    title: React.ReactNode
    onClose: () => void
    onSave?: () => void
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
    className?: string
    bodyClassName?: string
    cancelVariant?: 'cancel' | 'close'
    cancelText?: React.ReactNode
    saveText?: React.ReactNode
    saveDisabled?: boolean
    showSaveButton?: boolean
    hideCloseButton?: boolean
    size?: string
    width?: string
    titleIcon?: React.ReactNode
}

const AppModal = (props: Props): JSX.Element => {
    const {
        bodyClassName = '',
        cancelVariant,
        cancelText = 'Cancel',
        children,
        className = '',
        hideCloseButton = true,
        onClose,
        onSave,
        onSubmit,
        saveDisabled = false,
        saveText = 'Save',
        showSaveButton = true,
        size = 'small',
        title,
        titleIcon = <IconInfoCircle size={20}/>,
        width,
    } = props

    const cancelLabel = typeof cancelText === 'string' ? cancelText : ''
    const isCloseAction = cancelVariant ? cancelVariant === 'close' : cancelLabel.toLowerCase() === 'close'
    const modalStyle: AppModalStyle | undefined = width ? {'--app-modal-width': width} : undefined
    const body = (
        <>
            <div className={`AppModal__body ${bodyClassName}`}>
                {children}
            </div>
            <div className='AppModal__footer'>
                <button
                    className={`AppModal__cancel ${isCloseAction ? 'AppModal__cancel--close' : ''}`}
                    type='button'
                    onClick={onClose}
                >
                    <span className='AppModal__cancelIcon'>
                        <IconX size={16}/>
                    </span>
                    {cancelText}
                </button>
                {showSaveButton &&
                    <button
                        className='AppModal__save'
                        disabled={saveDisabled}
                        type={onSubmit ? 'submit' : 'button'}
                        onClick={onSave}
                    >
                        <IconCheck
                            className='icon'
                            size={17}
                        />
                        {saveText}
                    </button>}
            </div>
        </>
    )

    return (
        <RootPortal>
            <Dialog
                className={`AppModal ${className}`}
                disableBackdropClose={true}
                disableEscapeClose={true}
                hideCloseButton={hideCloseButton}
                size={size}
                style={modalStyle}
                title={(
                    <span className='AppModal__title'>
                        <span className='AppModal__titleIcon'>{titleIcon}</span>
                        {title}
                    </span>
                )}
                onClose={onClose}
            >
                {onSubmit ? (
                    <form
                        className='AppModal__form'
                        onSubmit={onSubmit}
                    >
                        {body}
                    </form>
                ) : (
                    <div className='AppModal__content'>
                        {body}
                    </div>
                )}
            </Dialog>
        </RootPortal>
    )
}

export default React.memo(AppModal)
