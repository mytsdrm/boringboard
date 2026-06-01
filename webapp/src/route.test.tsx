// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {render, screen} from '@testing-library/react'
import {Provider as ReduxProvider} from 'react-redux'
import {MemoryRouter, Switch} from 'react-router-dom'

import {mockStateStore} from './testUtils'

import FBRoute from './route'

describe('FBRoute', () => {
    const dashboardContent = 'Dashboard content'

    const renderRoute = (loggedIn: boolean | null) => {
        const store = mockStateStore([], {
            users: {
                loggedIn,
            },
        })

        return render(
            <ReduxProvider store={store}>
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Switch>
                        <FBRoute
                            loginRequired={true}
                            path='/dashboard'
                        >
                            <div>{dashboardContent}</div>
                        </FBRoute>
                    </Switch>
                </MemoryRouter>
            </ReduxProvider>,
        )
    }

    it('does not render protected route children while auth state is unknown', () => {
        renderRoute(null)

        expect(screen.queryByText(dashboardContent)).toBeNull()
    })

    it('renders protected route children after auth succeeds', () => {
        renderRoute(true)

        expect(screen.getByText(dashboardContent)).toBeDefined()
    })
})
