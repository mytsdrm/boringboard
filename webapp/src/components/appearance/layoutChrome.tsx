// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'
import {
    IconBattery3,
    IconLayoutGrid,
    IconMinus,
    IconPower,
    IconSquare,
    IconVolume,
    IconWifi,
    IconX,
} from '@tabler/icons-react'

import {BRANDING_UPDATED_EVENT, getStoredBranding, SystemBranding} from '../../branding'
import {getActiveLayoutName, layoutChangeEvent} from '../../layout'

import './layoutChrome.scss'

function useClock(): Date {
    const [now, setNow] = useState(new Date())
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 15000)
        return () => clearInterval(timer)
    }, [])
    return now
}

export function useLayoutName(): string {
    const [layout, setLayoutName] = useState(getActiveLayoutName())
    useEffect(() => {
        const handler = (e: Event) => setLayoutName((e as CustomEvent<string>).detail)
        window.addEventListener(layoutChangeEvent, handler)
        return () => window.removeEventListener(layoutChangeEvent, handler)
    }, [])
    return layout
}

function useBranding(): SystemBranding {
    const [branding, setBranding] = useState(getStoredBranding())
    useEffect(() => {
        const handler = (e: Event) => setBranding((e as CustomEvent<SystemBranding>).detail || getStoredBranding())
        window.addEventListener(BRANDING_UPDATED_EVENT, handler)
        return () => window.removeEventListener(BRANDING_UPDATED_EVENT, handler)
    }, [])
    return branding
}

type Props = {
    position: 'top' | 'bottom'
}

// Decorative desktop-style bars for the macOS, Windows, Ubuntu and ChromeOS
// layouts. They only carry the app name and a clock; the controls are visual.
const LayoutChrome = (props: Props): JSX.Element | null => {
    const intl = useIntl()
    const layout = useLayoutName()
    const now = useClock()
    const branding = useBranding()

    const time = intl.formatTime(now, {hour: '2-digit', minute: '2-digit'})
    const shortDate = intl.formatDate(now, {weekday: 'short', day: 'numeric', month: 'short'})

    if (props.position === 'bottom') {
        if (layout !== 'chromeos') {
            return null
        }
        return (
            <div
                className='LayoutChrome LayoutChrome--chromeos'
                aria-hidden='true'
            >
                <span className='LayoutChrome__launcher'/>
                <span className='LayoutChrome__shelf'>
                    <span className='LayoutChrome__shelfApp active'>
                        <img
                            src={branding.logo}
                            alt=''
                        />
                    </span>
                    <span className='LayoutChrome__shelfApp'><IconLayoutGrid size={18}/></span>
                </span>
                <span className='LayoutChrome__tray'>
                    <span>{shortDate}</span>
                    <span>{time}</span>
                    <IconWifi size={15}/>
                    <IconBattery3 size={15}/>
                </span>
            </div>
        )
    }

    if (layout === 'macos') {
        return (
            <div
                className='LayoutChrome LayoutChrome--macos'
                aria-hidden='true'
            >
                <span className='LayoutChrome__appName'>{branding.appName}</span>
                {['File', 'Edit', 'View', 'Window', 'Help'].map((item) => <span key={item}>{item}</span>)}
                <span className='LayoutChrome__spacer'/>
                <IconWifi size={14}/>
                <span>{`${shortDate}  ${time}`}</span>
            </div>
        )
    }

    if (layout === 'windows') {
        return (
            <div
                className='LayoutChrome LayoutChrome--windows'
                aria-hidden='true'
            >
                <img
                    src={branding.logo}
                    alt=''
                />
                <span className='LayoutChrome__appName'>{branding.appName}</span>
                <span className='LayoutChrome__spacer'/>
                <span className='LayoutChrome__control'><IconMinus size={15}/></span>
                <span className='LayoutChrome__control'><IconSquare size={12}/></span>
                <span className='LayoutChrome__control LayoutChrome__control--close'><IconX size={16}/></span>
            </div>
        )
    }

    if (layout === 'ubuntu') {
        return (
            <div
                className='LayoutChrome LayoutChrome--ubuntu'
                aria-hidden='true'
            >
                <span className='LayoutChrome__activities'>
                    <i/><i/><i/>
                </span>
                <span className='LayoutChrome__spacer'/>
                <span className='LayoutChrome__clock'>{`${shortDate}  ${time}`}</span>
                <span className='LayoutChrome__spacer'/>
                <span className='LayoutChrome__status'>
                    <IconWifi size={15}/>
                    <IconVolume size={15}/>
                    <IconPower size={15}/>
                </span>
            </div>
        )
    }

    return null
}

export default React.memo(LayoutChrome)
