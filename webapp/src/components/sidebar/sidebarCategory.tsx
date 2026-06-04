// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {generatePath, useHistory, useRouteMatch} from 'react-router-dom'

import {debounce} from 'lodash'

import {Draggable, Droppable} from 'react-beautiful-dnd'

import {HandRightIcon} from '@mattermost/compass-icons/components'

import {Board} from '../../blocks/board'
import mutator from '../../mutator'
import IconButton from '../../widgets/buttons/iconButton'
import DeleteIcon from '../../widgets/icons/delete'
import CompassIcon from '../../widgets/icons/compassIcon'
import OptionsIcon from '../../widgets/icons/options'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'

import './sidebarCategory.scss'
import {Category, CategoryBoardMetadata, CategoryBoards} from '../../store/sidebar'
import ChevronDown from '../../widgets/icons/chevronDown'
import ChevronRight from '../../widgets/icons/chevronRight'
import CreateNewFolder from '../../widgets/icons/newFolder'
import CreateCategory from '../createCategory/createCategory'
import {useAppSelector} from '../../store/hooks'
import {
    getMe,
    getOnboardingTourCategory,
    getOnboardingTourStep,
} from '../../store/users'

import {getCurrentCard} from '../../store/cards'
import {Utils} from '../../utils'

import {TOUR_SIDEBAR, SidebarTourSteps, TOUR_BOARD, FINISHED} from '../../components/onboardingTour/index'
import telemetryClient, {TelemetryActions, TelemetryCategory} from '../../telemetry/telemetryClient'

import {getCurrentTeam} from '../../store/teams'
import {UserSettings} from '../../userSettings'

import ConfirmationDialogBox, {ConfirmationDialogBoxProps} from '../confirmationDialogBox'

import SidebarCategoriesTourStep from '../../components/onboardingTour/sidebarCategories/sidebarCategories'
import ManageCategoriesTourStep from '../../components/onboardingTour/manageCategories/manageCategories'

import DeleteBoardDialog from './deleteBoardDialog'
import SidebarBoardItem from './sidebarBoardItem'

type Props = {
    activeCategoryId?: string
    activeBoardID?: string
    activeViewID?: string
    hideSidebar: () => void
    categoryBoards: CategoryBoards
    boards: Board[]
    allCategories: CategoryBoards[]
    index: number
    onBoardTemplateSelectorClose?: () => void
    draggedItemID?: string
    forceCollapse?: boolean
}

export const ClassForManageCategoriesTourStep = 'manageCategoriesTourStep'
const SIDEBAR_TASK_BOARD_GROUP_EVENT = 'boringboard:sidebar-task-board-group'

type SidebarTaskBoardGroup = 'personal' | 'joined'
type SidebarTaskBoardGroupEvent = CustomEvent<{group?: SidebarTaskBoardGroup}>

const SidebarCategory = (props: Props) => {
    const [collapsed, setCollapsed] = useState(props.categoryBoards.collapsed)
    const [personalBoardsCollapsed, setPersonalBoardsCollapsed] = useState(true)
    const [joinedBoardsCollapsed, setJoinedBoardsCollapsed] = useState(true)
    const intl = useIntl()
    const history = useHistory()

    const [deleteBoard, setDeleteBoard] = useState<Board|null>()
    const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState<boolean>(false)
    const [categoryMenuOpen, setCategoryMenuOpen] = useState<boolean>(false)

    const match = useRouteMatch<{boardId: string, viewId?: string, cardId?: string, teamId?: string}>()
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
    const [showUpdateCategoryModal, setShowUpdateCategoryModal] = useState(false)

    const onboardingTourCategory = useAppSelector(getOnboardingTourCategory)
    const onboardingTourStep = useAppSelector(getOnboardingTourStep)
    const me = useAppSelector(getMe)
    const currentCard = useAppSelector(getCurrentCard)
    const noCardOpen = !currentCard
    const team = useAppSelector(getCurrentTeam)
    const teamID = team?.id || ''

    const menuWrapperRef = useRef<HTMLDivElement>(null)

    const [boardDraggingOver, setBoardDraggingOver] = useState<boolean>(false)
    const isTaskBoardsCategory = props.categoryBoards.name === 'Boards'

    const shouldViewSidebarTour = props.boards.length !== 0 &&
                                  noCardOpen &&
                                  (onboardingTourCategory === TOUR_SIDEBAR || onboardingTourCategory === TOUR_BOARD) &&
                                  ((onboardingTourCategory === TOUR_SIDEBAR && onboardingTourStep === SidebarTourSteps.SIDE_BAR.toString()) || (onboardingTourCategory === TOUR_BOARD && onboardingTourStep === FINISHED.toString()))

    const shouldViewManageCatergoriesTour = props.boards.length !== 0 &&
                                            noCardOpen &&
                                            onboardingTourCategory === TOUR_SIDEBAR &&
                                            onboardingTourStep === SidebarTourSteps.MANAGE_CATEGORIES.toString()

    useEffect(() => {
        if (shouldViewManageCatergoriesTour && props.index === 0) {
            setCategoryMenuOpen(true)
        }
    }, [shouldViewManageCatergoriesTour])

    const showBoard = useCallback((boardId) => {
        if (boardId === props.activeBoardID && props.onBoardTemplateSelectorClose) {
            props.onBoardTemplateSelectorClose()
        }
        Utils.showBoard(boardId, match, history)
        props.hideSidebar()
    }, [match, history])

    const showView = useCallback((viewId, boardId) => {
        if (viewId === props.activeViewID && props.onBoardTemplateSelectorClose) {
            props.onBoardTemplateSelectorClose()
        }

        // if the same board, reuse the match params
        // otherwise remove viewId and cardId, results in first view being selected
        const params = {...match.params, boardId: boardId || '', viewId: viewId || ''}
        if (boardId !== match.params.boardId && viewId !== match.params.viewId) {
            params.cardId = undefined
        }
        const newPath = generatePath(Utils.getBoardPagePath(match.path), params)
        history.push(newPath)
        props.hideSidebar()
    }, [match, history])

    const showMain = useCallback(() => {
        const currentTeamID = match.params.teamId || teamID
        if (currentTeamID) {
            history.replace(`/team/${currentTeamID}`)
        } else {
            history.replace('/')
        }
        props.hideSidebar()
    }, [history, match.params.teamId, teamID])

    const isBoardVisible = (boardID: string, existingBoardMetadata?: CategoryBoardMetadata): boolean => {
        const categoryBoardMetadata = existingBoardMetadata || sidebarBoardMetadata.find((metadata) => metadata.boardID === boardID)

        // hide if board doesn't belong to current category
        if (!categoryBoardMetadata) {
            return false
        }

        // hide if board was hidden by the user
        return !categoryBoardMetadata.hidden
    }

    const sidebarBoardMetadata = props.categoryBoards.boardMetadata || []
    const visibleBlocks = props.categoryBoards.boardMetadata.filter((boardMetadata) => isBoardVisible(boardMetadata.boardID, boardMetadata))
    const visibleBoards = props.boards.filter((board) => isBoardVisible(board.id) && !board.isTemplate)
    const personalBoards = visibleBoards.filter((board) => board.createdBy === me?.id)
    const joinedBoards = visibleBoards.filter((board) => board.createdBy !== me?.id)

    useEffect(() => {
        if (!isTaskBoardsCategory || !props.activeBoardID) {
            return
        }

        if (personalBoards.some((board) => board.id === props.activeBoardID)) {
            setPersonalBoardsCollapsed(false)
        }

        if (joinedBoards.some((board) => board.id === props.activeBoardID)) {
            setJoinedBoardsCollapsed(false)
        }
    }, [isTaskBoardsCategory, joinedBoards, personalBoards, props.activeBoardID])

    useEffect(() => {
        if (!isTaskBoardsCategory) {
            return undefined
        }

        const handleTaskBoardGroupEvent = (event: Event) => {
            const group = (event as SidebarTaskBoardGroupEvent).detail?.group

            if (group === 'personal') {
                setPersonalBoardsCollapsed(false)
            }

            if (group === 'joined') {
                setJoinedBoardsCollapsed(false)
            }
        }

        window.addEventListener(SIDEBAR_TASK_BOARD_GROUP_EVENT, handleTaskBoardGroupEvent)
        return () => window.removeEventListener(SIDEBAR_TASK_BOARD_GROUP_EVENT, handleTaskBoardGroupEvent)
    }, [isTaskBoardsCategory])

    const handleCreateNewCategory = () => {
        setShowCreateCategoryModal(true)
    }

    const handleDeleteCategory = async () => {
        await mutator.deleteCategory(teamID, props.categoryBoards.id)
    }

    const handleUpdateCategory = async () => {
        setShowUpdateCategoryModal(true)
    }

    const deleteCategoryProps: ConfirmationDialogBoxProps = {
        heading: intl.formatMessage({
            id: 'SidebarCategories.CategoryMenu.DeleteModal.Title',
            defaultMessage: 'Delete this category?',
        }),
        subText: intl.formatMessage(
            {
                id: 'SidebarCategories.CategoryMenu.DeleteModal.Body',
                defaultMessage: 'Boards in <b>{categoryName}</b> will move back to the Boards categories. You\'re not removed from any boards.',
            },
            {
                categoryName: props.categoryBoards.name,
                b: (...chunks) => <b>{chunks}</b>,
            },
        ),
        onConfirm: () => handleDeleteCategory(),
        onClose: () => setShowDeleteCategoryDialog(false),
    }

    const onDeleteBoard = useCallback(async () => {
        if (!deleteBoard) {
            return
        }
        telemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DeleteBoard, {board: deleteBoard.id})
        const currentTeamID = match.params.teamId || teamID
        if (currentTeamID) {
            UserSettings.setLastBoardID(currentTeamID, null)
        }
        UserSettings.setLastViewId(deleteBoard.id, null)

        await mutator.deleteBoard(
            deleteBoard,
            intl.formatMessage({id: 'Sidebar.delete-board', defaultMessage: 'Delete board'}),
            async () => {
                // This delay is needed because WSClient has a default 100 ms notification delay before updates
                await new Promise((resolve) => setTimeout(resolve, 120))
                showMain()
            },
            async () => {
                showBoard(deleteBoard.id)
            },
        )
    }, [showMain, showBoard, deleteBoard, match.params.teamId, teamID])

    const updateCategory = useCallback(async (value: boolean) => {
        const updatedCategory: Category = {
            ...props.categoryBoards,
            collapsed: value,
        }
        await mutator.updateCategory(updatedCategory)
    }, [props.categoryBoards])

    const debouncedUpdateCategory = useMemo(() => debounce(updateCategory, 400), [updateCategory])

    const toggleCollapse = async () => {
        if (isTaskBoardsCategory) {
            return
        }

        const newVal = !collapsed
        await setCollapsed(newVal)

        // The default 'Boards' category isn't stored in database,
        // so avoid making the API call for it
        if (props.categoryBoards.id !== '') {
            debouncedUpdateCategory(newVal)
        }
    }

    const newCategoryBadge = (
        <div className='badge newCategoryBadge'>
            <span>
                {
                    intl.formatMessage({
                        id: 'Sidebar.new-category.badge',
                        defaultMessage: 'New',
                    })
                }
            </span>
        </div>
    )

    const newCategoryDragArea = (
        <div className='newCategoryDragArea'>
            <HandRightIcon/>
            <span>
                {
                    intl.formatMessage({
                        id: 'Sidebar.new-category.drag-boards-cta',
                        defaultMessage: 'Drag boards here...',
                    })
                }
            </span>
        </div>
    )

    const categoryName = isTaskBoardsCategory ? intl.formatMessage({
        id: 'Sidebar.task-boards',
        defaultMessage: 'Task Boards',
    }) : props.categoryBoards.name
    const categoryCollapsed = isTaskBoardsCategory ? false : collapsed

    const delayedSetBoardDraggingOver = (isDraggingOver: boolean) => {
        setTimeout(() => {
            setBoardDraggingOver(isDraggingOver)
        }, 200)
    }

    const renderBoardItem = (board: Board, index: number, dragDisabled?: boolean) => (
        <SidebarBoardItem
            index={index}
            key={board.id}
            board={board}
            categoryBoards={props.categoryBoards}
            allCategories={props.allCategories}
            isActive={board.id === props.activeBoardID}
            showBoard={showBoard}
            showView={showView}
            onDeleteRequest={setDeleteBoard}
            hideViews={props.draggedItemID === board.id || props.draggedItemID === props.categoryBoards.id}
            dragDisabled={dragDisabled}
        />
    )

    const renderTaskBoardGroup = (
        key: string,
        label: React.ReactNode,
        groupBoards: Board[],
        isCollapsed: boolean,
        onToggle: () => void,
        startIndex: number,
    ) => (
        <div
            className='sidebar-task-board-group'
            key={key}
        >
            <button
                type='button'
                className={`sidebar-task-board-group-title${isCollapsed ? ' collapsed' : ' expanded'}`}
                onClick={onToggle}
            >
                {isCollapsed ? <ChevronRight/> : <ChevronDown/>}
                <span>{label}</span>
                <span className={`sidebar-task-board-group-count ${key}`}>{groupBoards.length}</span>
            </button>
            {!isCollapsed && groupBoards.length === 0 &&
                <div className='octo-sidebar-item subitem no-views sidebar-task-board-empty'>
                    <FormattedMessage
                        id='Sidebar.no-boards-in-group'
                        defaultMessage='No boards inside'
                    />
                </div>}
            {!isCollapsed && groupBoards.map((board, index) => renderBoardItem(board, startIndex + index, true))}
        </div>
    )

    return (
        <Draggable
            draggableId={props.categoryBoards.id}
            key={props.categoryBoards.id}
            index={props.index}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                >
                    <div
                        className={`SidebarCategory${props.categoryBoards.isNew ? ' new' : ''}${boardDraggingOver ? ' draggingOver' : ''}`}
                        ref={menuWrapperRef}
                    >
                        <Droppable
                            droppableId={props.categoryBoards.id}
                            type='board'
                        >
                            {(categoryProvided, categorySnapshot) => {
                                if (boardDraggingOver !== categorySnapshot.isDraggingOver) {
                                    delayedSetBoardDraggingOver(categorySnapshot.isDraggingOver)
                                }

                                return (
                                    <div
                                        className={`categoryBoardsDroppableArea${categorySnapshot.isDraggingOver ? ' draggingOver' : ''}`}
                                        ref={categoryProvided.innerRef}
                                        {...categoryProvided.droppableProps}
                                    >
                                        <div
                                            className={`octo-sidebar-item category ${categoryCollapsed || props.forceCollapse ? 'collapsed' : 'expanded'} ${props.categoryBoards.id === props.activeCategoryId ? 'active' : ''}`}
                                        >
                                            <div
                                                className='octo-sidebar-title category-title'
                                                title={categoryName}
                                                onClick={toggleCollapse}
                                                {...provided.dragHandleProps}
                                            >
                                                {categoryCollapsed || snapshot.isDragging || props.forceCollapse ? <ChevronRight/> : <ChevronDown/>}
                                                {categoryName}
                                                <div className='sidebarCategoriesTour'>
                                                    {props.index === 0 && shouldViewSidebarTour && <SidebarCategoriesTourStep/>}
                                                </div>
                                            </div>
                                            <div className={(props.index === 0 && shouldViewManageCatergoriesTour) ? `${ClassForManageCategoriesTourStep}` : ''}>
                                                {props.index === 0 && shouldViewManageCatergoriesTour && <ManageCategoriesTourStep/>}

                                                {props.categoryBoards.isNew && !categoryMenuOpen && newCategoryBadge}

                                                <MenuWrapper
                                                    className={categoryMenuOpen ? 'menuOpen' : ''}
                                                    stopPropagationOnToggle={true}
                                                    onToggle={(open) => setCategoryMenuOpen(open)}
                                                >
                                                    <IconButton icon={<OptionsIcon/>}/>
                                                    <Menu
                                                        position='auto'
                                                        fixed={true}
                                                        parentRef={menuWrapperRef}
                                                    >
                                                        {
                                                            props.categoryBoards.type === 'custom' &&
                                                            <React.Fragment>
                                                                <Menu.Text
                                                                    id='updateCategory'
                                                                    name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.Update', defaultMessage: 'Rename Category'})}
                                                                    icon={<CompassIcon icon='pencil-outline'/>}
                                                                    onClick={handleUpdateCategory}
                                                                />
                                                                <Menu.Text
                                                                    id='deleteCategory'
                                                                    className='text-danger'
                                                                    name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.Delete', defaultMessage: 'Delete Category'})}
                                                                    icon={<DeleteIcon/>}
                                                                    onClick={() => setShowDeleteCategoryDialog(true)}
                                                                />
                                                                <Menu.Separator/>
                                                            </React.Fragment>
                                                        }
                                                        <Menu.Text
                                                            id='createNewCategory'
                                                            name={intl.formatMessage({id: 'SidebarCategories.CategoryMenu.CreateNew', defaultMessage: 'Create New Category'})}
                                                            icon={<CreateNewFolder/>}
                                                            onClick={handleCreateNewCategory}
                                                        />
                                                    </Menu>
                                                </MenuWrapper>
                                            </div>
                                        </div>
                                        {!(categoryCollapsed || props.forceCollapse || snapshot.isDragging || props.draggedItemID === props.categoryBoards.id) && !isTaskBoardsCategory && visibleBlocks.length === 0 &&
                                            (
                                                <div>
                                                    {!props.categoryBoards.isNew && (
                                                        <div className='octo-sidebar-item subitem no-views'>
                                                            <FormattedMessage
                                                                id='Sidebar.no-boards-in-category'
                                                                defaultMessage='No boards inside'
                                                            />
                                                        </div>
                                                    )}

                                                    {props.categoryBoards.isNew && newCategoryDragArea}
                                                </div>
                                            )
                                        }
                                        {!props.forceCollapse && categoryCollapsed && !snapshot.isDragging && props.draggedItemID !== props.categoryBoards.id && props.boards.filter((board: Board) => board.id === props.activeBoardID).map((board: Board, zzz) => {
                                            if (!isBoardVisible(board.id)) {
                                                return null
                                            }
                                            return (
                                                <SidebarBoardItem
                                                    index={zzz}
                                                    key={board.id}
                                                    board={board}
                                                    categoryBoards={props.categoryBoards}
                                                    allCategories={props.allCategories}
                                                    isActive={board.id === props.activeBoardID}
                                                    showBoard={showBoard}
                                                    showView={showView}
                                                    onDeleteRequest={setDeleteBoard}
                                                />
                                            )
                                        })}
                                        {!(categoryCollapsed || props.forceCollapse || snapshot.isDragging || props.draggedItemID === props.categoryBoards.id) && isTaskBoardsCategory &&
                                            <>
                                                {renderTaskBoardGroup(
                                                    'personal-task-boards',
                                                    <FormattedMessage
                                                        id='Sidebar.personal-task-board'
                                                        defaultMessage='Personal Task Board'
                                                    />,
                                                    personalBoards,
                                                    personalBoardsCollapsed,
                                                    () => setPersonalBoardsCollapsed((isCollapsed) => !isCollapsed),
                                                    0,
                                                )}
                                                {renderTaskBoardGroup(
                                                    'joined-task-boards',
                                                    <FormattedMessage
                                                        id='Sidebar.joined-task-boards'
                                                        defaultMessage='Joined Task Boards'
                                                    />,
                                                    joinedBoards,
                                                    joinedBoardsCollapsed,
                                                    () => setJoinedBoardsCollapsed((isCollapsed) => !isCollapsed),
                                                    personalBoards.length,
                                                )}
                                            </>}
                                        {!(categoryCollapsed || props.forceCollapse || snapshot.isDragging || props.draggedItemID === props.categoryBoards.id) && !isTaskBoardsCategory && visibleBoards.map((board: Board, zzz) => renderBoardItem(board, zzz))}
                                        {categoryProvided.placeholder}
                                    </div>
                                )
                            }}
                        </Droppable>

                        {
                            showCreateCategoryModal && (
                                <CreateCategory
                                    onClose={() => setShowCreateCategoryModal(false)}
                                    title={(
                                        <FormattedMessage
                                            id='SidebarCategories.CategoryMenu.CreateNew'
                                            defaultMessage='Create New Category'
                                        />
                                    )}
                                />
                            )
                        }

                        {
                            showUpdateCategoryModal && (
                                <CreateCategory
                                    initialValue={props.categoryBoards.name}
                                    title={(
                                        <FormattedMessage
                                            id='SidebarCategories.CategoryMenu.Update'
                                            defaultMessage='Rename Category'
                                        />
                                    )}
                                    onClose={() => setShowUpdateCategoryModal(false)}
                                    boardCategoryId={props.categoryBoards.id}
                                    renameModal={true}
                                />
                            )
                        }

                        { deleteBoard &&
                        <DeleteBoardDialog
                            boardTitle={deleteBoard.title}
                            onClose={() => setDeleteBoard(null)}
                            onDelete={onDeleteBoard}
                        />
                        }

                        {
                            showDeleteCategoryDialog && <ConfirmationDialogBox dialogBox={deleteCategoryProps}/>
                        }
                    </div>
                </div>
            )}
        </Draggable>
    )
}

export default React.memo(SidebarCategory)
