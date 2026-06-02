// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ChangeEvent, useMemo, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {
    StoredIcon,
    encodeStoredIcon,
    storedIconDefinitions,
} from '../components/icons/storedIcon'

import './iconLibraryPicker.scss'

type Props = {
    onSelect: (icon: string) => void
}

const IconLibraryPicker = React.memo((props: Props) => {
    const intl = useIntl()
    const [search, setSearch] = useState('')

    const filteredIcons = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) {
            return storedIconDefinitions
        }

        return storedIconDefinitions.filter((icon) => (
            icon.label.toLowerCase().includes(query) ||
            icon.category.toLowerCase().includes(query) ||
            icon.id.toLowerCase().includes(query)
        ))
    }, [search])

    const groupedIcons = useMemo(() => {
        return filteredIcons.reduce<Record<string, typeof storedIconDefinitions>>((groups, icon) => {
            if (!groups[icon.category]) {
                groups[icon.category] = []
            }
            groups[icon.category].push(icon)
            return groups
        }, {})
    }, [filteredIcons])

    return (
        <div className='IconLibraryPicker'>
            <input
                className='IconLibraryPicker__search'
                type='search'
                value={search}
                placeholder={intl.formatMessage({id: 'IconLibrary.search', defaultMessage: 'Search icons'})}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <div className='IconLibraryPicker__content'>
                {Object.keys(groupedIcons).map((category) => (
                    <section
                        key={category}
                        className='IconLibraryPicker__group'
                    >
                        <div className='IconLibraryPicker__category'>{category}</div>
                        <div className='IconLibraryPicker__grid'>
                            {groupedIcons[category].map((icon) => (
                                <button
                                    key={icon.id}
                                    type='button'
                                    className='IconLibraryPicker__item'
                                    title={icon.label}
                                    onClick={() => props.onSelect(encodeStoredIcon(icon.id))}
                                >
                                    <StoredIcon icon={encodeStoredIcon(icon.id)}/>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
                {filteredIcons.length === 0 &&
                    <div className='IconLibraryPicker__empty'>
                        <FormattedMessage
                            id='IconLibrary.empty'
                            defaultMessage='No icons found'
                        />
                    </div>}
            </div>
        </div>
    )
})

export default IconLibraryPicker
