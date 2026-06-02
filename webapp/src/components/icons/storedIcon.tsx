// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {IconType} from 'react-icons'
import {
    FaAndroid,
    FaApple,
    FaBug,
    FaDocker,
    FaFacebook,
    FaGithub,
    FaGoogle,
    FaInstagram,
    FaRegCalendarAlt,
    FaRegLightbulb,
    FaTiktok,
    FaYoutube,
} from 'react-icons/fa'
import {FaXTwitter} from 'react-icons/fa6'
import {HiSparkles} from 'react-icons/hi2'
import {
    LuActivity,
    LuBot,
    LuCode,
    LuFlag,
    LuGlobe,
    LuHeart,
    LuImage,
    LuListTodo,
    LuLock,
    LuLogIn,
    LuLogOut,
    LuMessageCircle,
    LuNetwork,
    LuRepeat2,
    LuServer,
    LuSettings,
    LuShare2,
    LuShieldCheck,
    LuSmartphone,
    LuSquareKanban,
    LuTable2,
    LuTestTube,
    LuThumbsUp,
    LuUserPlus,
    LuUsers,
    LuWorkflow,
} from 'react-icons/lu'
import {
    MdOutlineAddTask,
    MdOutlineCalendarMonth,
    MdOutlineDashboardCustomize,
    MdOutlineIntegrationInstructions,
    MdOutlineRocketLaunch,
    MdOutlineTaskAlt,
    MdOutlineViewKanban,
} from 'react-icons/md'
import {
    SiCanva,
    SiGo,
    SiGooglegemini,
    SiKubernetes,
    SiMattermost,
    SiMysql,
    SiNodedotjs,
    SiOllama,
    SiOpenai,
    SiPostgresql,
    SiReact,
    SiRedis,
    SiThreads,
    SiTypescript,
} from 'react-icons/si'

import './storedIcon.scss'

export const STORED_ICON_PREFIX = 'bb-icon:'

export type StoredIconDefinition = {
    id: string
    label: string
    category: string
    Icon: IconType
}

export const storedIconDefinitions: StoredIconDefinition[] = [
    {id: 'brand-facebook', label: 'Facebook', category: 'Brands', Icon: FaFacebook},
    {id: 'brand-twitter-x', label: 'Twitter/X', category: 'Brands', Icon: FaXTwitter},
    {id: 'brand-instagram', label: 'Instagram', category: 'Brands', Icon: FaInstagram},
    {id: 'brand-tiktok', label: 'TikTok', category: 'Brands', Icon: FaTiktok},
    {id: 'brand-threads', label: 'Threads', category: 'Brands', Icon: SiThreads},
    {id: 'brand-youtube', label: 'YouTube', category: 'Brands', Icon: FaYoutube},
    {id: 'brand-android', label: 'Android', category: 'Brands', Icon: FaAndroid},
    {id: 'brand-apple', label: 'Apple', category: 'Brands', Icon: FaApple},
    {id: 'brand-google', label: 'Google', category: 'Brands', Icon: FaGoogle},
    {id: 'brand-github', label: 'GitHub', category: 'Brands', Icon: FaGithub},
    {id: 'brand-docker', label: 'Docker', category: 'Brands', Icon: FaDocker},
    {id: 'brand-mattermost', label: 'Mattermost', category: 'Brands', Icon: SiMattermost},
    {id: 'ai-sparkles', label: 'AI', category: 'AI & Tech', Icon: HiSparkles},
    {id: 'ai-bot', label: 'Bot', category: 'AI & Tech', Icon: LuBot},
    {id: 'ai-openai', label: 'OpenAI', category: 'AI & Tech', Icon: SiOpenai},
    {id: 'ai-gemini', label: 'Gemini', category: 'AI & Tech', Icon: SiGooglegemini},
    {id: 'ai-ollama', label: 'Ollama', category: 'AI & Tech', Icon: SiOllama},
    {id: 'tech-server', label: 'Server', category: 'AI & Tech', Icon: LuServer},
    {id: 'tech-network', label: 'Network', category: 'AI & Tech', Icon: LuNetwork},
    {id: 'tech-code', label: 'Code', category: 'AI & Tech', Icon: LuCode},
    {id: 'tech-react', label: 'React', category: 'AI & Tech', Icon: SiReact},
    {id: 'tech-typescript', label: 'TypeScript', category: 'AI & Tech', Icon: SiTypescript},
    {id: 'tech-go', label: 'Go', category: 'AI & Tech', Icon: SiGo},
    {id: 'tech-node', label: 'Node.js', category: 'AI & Tech', Icon: SiNodedotjs},
    {id: 'tech-kubernetes', label: 'Kubernetes', category: 'AI & Tech', Icon: SiKubernetes},
    {id: 'data-postgres', label: 'PostgreSQL', category: 'Data', Icon: SiPostgresql},
    {id: 'data-mysql', label: 'MySQL', category: 'Data', Icon: SiMysql},
    {id: 'data-redis', label: 'Redis', category: 'Data', Icon: SiRedis},
    {id: 'work-task', label: 'Task', category: 'Work', Icon: MdOutlineTaskAlt},
    {id: 'work-todo', label: 'To do', category: 'Work', Icon: LuListTodo},
    {id: 'work-kanban', label: 'Kanban', category: 'Work', Icon: MdOutlineViewKanban},
    {id: 'work-board', label: 'Board', category: 'Work', Icon: LuSquareKanban},
    {id: 'work-table', label: 'Table', category: 'Work', Icon: LuTable2},
    {id: 'work-calendar', label: 'Calendar', category: 'Work', Icon: MdOutlineCalendarMonth},
    {id: 'work-dashboard', label: 'Dashboard', category: 'Work', Icon: MdOutlineDashboardCustomize},
    {id: 'work-workflow', label: 'Workflow', category: 'Work', Icon: LuWorkflow},
    {id: 'work-launch', label: 'Launch', category: 'Work', Icon: MdOutlineRocketLaunch},
    {id: 'work-add-task', label: 'Add task', category: 'Work', Icon: MdOutlineAddTask},
    {id: 'work-integration', label: 'Integration', category: 'Work', Icon: MdOutlineIntegrationInstructions},
    {id: 'action-login', label: 'Login', category: 'Actions', Icon: LuLogIn},
    {id: 'action-logout', label: 'Logout', category: 'Actions', Icon: LuLogOut},
    {id: 'action-post', label: 'Post', category: 'Actions', Icon: LuMessageCircle},
    {id: 'action-media', label: 'Media', category: 'Actions', Icon: LuImage},
    {id: 'action-share', label: 'Share', category: 'Actions', Icon: LuShare2},
    {id: 'action-repost', label: 'Repost', category: 'Actions', Icon: LuRepeat2},
    {id: 'action-like', label: 'Like', category: 'Actions', Icon: LuThumbsUp},
    {id: 'action-heart', label: 'Heart', category: 'Actions', Icon: LuHeart},
    {id: 'action-follow', label: 'Follow', category: 'Actions', Icon: LuUserPlus},
    {id: 'action-report', label: 'Report', category: 'Actions', Icon: LuFlag},
    {id: 'action-lock', label: 'Lock', category: 'Actions', Icon: LuLock},
    {id: 'action-globe', label: 'Surfing', category: 'Actions', Icon: LuGlobe},
    {id: 'ops-mobile', label: 'Device farm', category: 'Operations', Icon: LuSmartphone},
    {id: 'ops-shield', label: 'Reliability', category: 'Operations', Icon: LuShieldCheck},
    {id: 'ops-test', label: 'Testing', category: 'Operations', Icon: LuTestTube},
    {id: 'ops-bug', label: 'Bug', category: 'Operations', Icon: FaBug},
    {id: 'ops-activity', label: 'Activity', category: 'Operations', Icon: LuActivity},
    {id: 'ops-users', label: 'Users', category: 'Operations', Icon: LuUsers},
    {id: 'ops-settings', label: 'Settings', category: 'Operations', Icon: LuSettings},
    {id: 'creative-canva', label: 'Canva', category: 'Creative', Icon: SiCanva},
    {id: 'creative-idea', label: 'Idea', category: 'Creative', Icon: FaRegLightbulb},
    {id: 'creative-calendar', label: 'Schedule', category: 'Creative', Icon: FaRegCalendarAlt},
]

const storedIconById = new Map(storedIconDefinitions.map((icon) => [icon.id, icon]))

export function encodeStoredIcon(id: string): string {
    return `${STORED_ICON_PREFIX}${id}`
}

export function decodeStoredIcon(value?: string): StoredIconDefinition | undefined {
    if (!value?.startsWith(STORED_ICON_PREFIX)) {
        return undefined
    }

    return storedIconById.get(value.slice(STORED_ICON_PREFIX.length))
}

export function isStoredIcon(value?: string): boolean {
    return Boolean(decodeStoredIcon(value))
}

type StoredIconProps = {
    icon?: string
    className?: string
}

export function StoredIcon(props: StoredIconProps): JSX.Element | null {
    const storedIcon = decodeStoredIcon(props.icon)
    if (storedIcon) {
        const Icon = storedIcon.Icon
        return (
            <span
                className={`StoredIcon StoredIcon--library ${props.className || ''}`.trim()}
                title={storedIcon.label}
            >
                <Icon aria-hidden='true'/>
            </span>
        )
    }

    if (!props.icon) {
        return null
    }

    return (
        <span className={`StoredIcon StoredIcon--emoji ${props.className || ''}`.trim()}>
            {props.icon}
        </span>
    )
}
