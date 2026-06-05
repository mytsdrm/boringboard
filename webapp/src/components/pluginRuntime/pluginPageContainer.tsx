// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'

type Props = {
    error?: string
    rootRef: React.RefObject<HTMLDivElement>
}

const PluginPageContainer = (props: Props): JSX.Element => {
    return (
        <div className='PluginPageContainer'>
            <div
                className='plugin-page-root'
                ref={props.rootRef}
            />
            {props.error &&
                <div className='plugin-page-error'>
                    {props.error}
                </div>}
        </div>
    )
}

export default React.memo(PluginPageContainer)
