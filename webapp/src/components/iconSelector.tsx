// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {useIntl} from 'react-intl'

import RandomIcon from '../widgets/icons/random'
import EmojiPicker from '../widgets/emojiPicker'
import IconLibraryPicker from '../widgets/iconLibraryPicker'
import DeleteIcon from '../widgets/icons/delete'
import EmojiIcon from '../widgets/icons/emoji'
import Menu from '../widgets/menu'
import MenuWrapper from '../widgets/menuWrapper'
import './iconSelector.scss'

type IconPickerPanelProps = {
    onSelectIcon: (icon: string) => void
}

type Props = {
    readonly?: boolean
    iconElement: any
    onAddRandomIcon: any
    onSelectEmoji: any
    onRemoveIcon: any
}

const IconPickerPanel = React.memo((props: IconPickerPanelProps) => {
    const intl = useIntl()
    const [activePicker, setActivePicker] = useState<'library' | 'emoji'>('library')

    return (
        <div
            className='IconSelector__pickers'
            onClick={(e) => e.stopPropagation()}
        >
            <div className='IconSelector__pickerTabs'>
                <button
                    type='button'
                    className={`IconSelector__pickerTab ${activePicker === 'library' ? 'active' : ''}`}
                    onClick={() => setActivePicker('library')}
                >
                    {intl.formatMessage({id: 'IconLibrary.library-tab', defaultMessage: 'Library'})}
                </button>
                <button
                    type='button'
                    className={`IconSelector__pickerTab ${activePicker === 'emoji' ? 'active' : ''}`}
                    onClick={() => setActivePicker('emoji')}
                >
                    {intl.formatMessage({id: 'IconLibrary.emoji-tab', defaultMessage: 'Emoji'})}
                </button>
            </div>
            <div className='IconSelector__pickerPanel'>
                {activePicker === 'library' &&
                    <IconLibraryPicker onSelect={props.onSelectIcon}/>}
                {activePicker === 'emoji' &&
                    <EmojiPicker onSelect={props.onSelectIcon}/>}
            </div>
        </div>
    )
})

const IconSelector = React.memo((props: Props) => {
    const intl = useIntl()

    return (
        <div className='IconSelector'>
            {props.readonly && props.iconElement}
            {!props.readonly &&
                <MenuWrapper>
                    {props.iconElement}
                    <Menu>
                        <Menu.Text
                            id='random'
                            icon={<RandomIcon/>}
                            name={intl.formatMessage({id: 'ViewTitle.random-icon', defaultMessage: 'Random'})}
                            onClick={props.onAddRandomIcon}
                        />
                        <Menu.SubMenu
                            id='pick'
                            icon={<EmojiIcon/>}
                            name={intl.formatMessage({id: 'ViewTitle.pick-icon', defaultMessage: 'Pick icon'})}
                        >
                            <IconPickerPanel onSelectIcon={props.onSelectEmoji}/>
                        </Menu.SubMenu>
                        <Menu.Text
                            id='remove'
                            icon={<DeleteIcon/>}
                            name={intl.formatMessage({id: 'ViewTitle.remove-icon', defaultMessage: 'Remove icon'})}
                            onClick={props.onRemoveIcon}
                        />
                    </Menu>
                </MenuWrapper>
            }
        </div>
    )
})

export default IconSelector
