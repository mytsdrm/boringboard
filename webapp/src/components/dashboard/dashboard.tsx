// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'

import {Card} from '../../blocks/card'
import octoClient from '../../octoClient'
import {getMySortedBoards} from '../../store/boards'
import {useAppSelector} from '../../store/hooks'
import CompassIcon from '../../widgets/icons/compassIcon'

import './dashboard.scss'

type BoardStats = {
    total: number
}

const Dashboard = (): JSX.Element => {
    const boards = useAppSelector(getMySortedBoards)
    const [statsByBoard, setStatsByBoard] = useState<{[boardId: string]: BoardStats}>({})
    const taskBoards = useMemo(() => boards.filter((board) => !board.isTemplate), [boards])

    useEffect(() => {
        let canceled = false

        async function loadStats() {
            const entries = await Promise.all(taskBoards.map(async (board) => {
                const blocks = await octoClient.getAllBlocks(board.id)
                const cards = blocks.filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
                return [board.id, {total: cards.length}] as [string, BoardStats]
            }))

            if (!canceled) {
                setStatsByBoard(Object.fromEntries(entries))
            }
        }

        loadStats()

        return () => {
            canceled = true
        }
    }, [taskBoards])

    const totalTasks = useMemo(() => {
        return taskBoards.reduce((result, board) => {
            const stats = statsByBoard[board.id]
            return result + (stats?.total || 0)
        }, 0)
    }, [taskBoards, statsByBoard])

    return (
        <div className='Dashboard'>
            <div className='dashboard-header'>
                <div>
                    <div className='dashboard-eyebrow'>{'Dashboard'}</div>
                    <h1>{'Workspace summary'}</h1>
                    <p>{'A clean overview of your Task Boards and the tasks inside them.'}</p>
                </div>
            </div>

            <section className='dashboard-metric-grid'>
                <div className='dashboard-metric-card board-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='product-boards'/>
                    </div>
                    <div className='metric-content'>
                        <span>{'Task Boards'}</span>
                        <strong>{taskBoards.length}</strong>
                        <p>{'Active boards in your personal workspace.'}</p>
                    </div>
                </div>

                <div className='dashboard-metric-card task-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='checkbox-multiple-marked-outline'/>
                    </div>
                    <div className='metric-content'>
                        <span>{'Total Tasks'}</span>
                        <strong>{totalTasks}</strong>
                        <p>{'Cards counted across all Task Boards.'}</p>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default React.memo(Dashboard)
