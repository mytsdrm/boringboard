// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {IconType} from 'react-icons'
import {
    FaAndroid,
    FaApple,
    FaBug,
    FaCloudflare,
    FaDiscord,
    FaDocker,
    FaDropbox,
    FaFacebook,
    FaFigma,
    FaGithub,
    FaGitlab,
    FaGoogle,
    FaInstagram,
    FaJira,
    FaLaravel,
    FaLinux,
    FaMicrosoft,
    FaNpm,
    FaPhp,
    FaPython,
    FaRegCalendarAlt,
    FaRegLightbulb,
    FaSlack,
    FaTiktok,
    FaTrello,
    FaUbuntu,
    FaVuejs,
    FaWordpress,
    FaYoutube,
} from 'react-icons/fa'
import {FaAws, FaXTwitter} from 'react-icons/fa6'
import {HiSparkles} from 'react-icons/hi2'
import {
    LuActivity,
    LuBell,
    LuBookOpen,
    LuBot,
    LuBriefcase,
    LuBuilding,
    LuCable,
    LuCamera,
    LuChartBar,
    LuChartNoAxesCombined,
    LuCircleDollarSign,
    LuClock,
    LuCloud,
    LuCloudUpload,
    LuCode,
    LuCpu,
    LuDatabase,
    LuDownload,
    LuEye,
    LuFileText,
    LuFilter,
    LuFlag,
    LuFolder,
    LuGauge,
    LuGlobe,
    LuHardDrive,
    LuHeart,
    LuImage,
    LuInbox,
    LuKey,
    LuLayers,
    LuLifeBuoy,
    LuListTodo,
    LuLock,
    LuLogIn,
    LuLogOut,
    LuMail,
    LuMap,
    LuMapPin,
    LuMegaphone,
    LuMessageCircle,
    LuMonitor,
    LuNetwork,
    LuPackage,
    LuPalette,
    LuPencil,
    LuPhone,
    LuPlug,
    LuPrinter,
    LuPuzzle,
    LuQrCode,
    LuRepeat2,
    LuRocket,
    LuSave,
    LuSearch,
    LuSend,
    LuServer,
    LuSettings,
    LuShare2,
    LuShieldCheck,
    LuShoppingCart,
    LuSmartphone,
    LuSquareKanban,
    LuStar,
    LuTable2,
    LuTag,
    LuTerminal,
    LuTestTube,
    LuThumbsUp,
    LuTicket,
    LuTimer,
    LuTrash2,
    LuUpload,
    LuUserPlus,
    LuUsers,
    LuWallet,
    LuWifi,
    LuWrench,
    LuWorkflow,
    LuZap,
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
    SiClickup,
    SiDatadog,
    SiDjango,
    SiElasticsearch,
    SiFastapi,
    SiFirebase,
    SiFlask,
    SiGo,
    SiGooglegemini,
    SiGrafana,
    SiGraphql,
    SiJenkins,
    SiKubernetes,
    SiMattermost,
    SiMongodb,
    SiMysql,
    SiNextdotjs,
    SiNginx,
    SiNodedotjs,
    SiOllama,
    SiOpenai,
    SiPrisma,
    SiPrometheus,
    SiPostgresql,
    SiReact,
    SiRedis,
    SiSentry,
    SiStripe,
    SiSupabase,
    SiSvelte,
    SiTailwindcss,
    SiTerraform,
    SiThreads,
    SiTypescript,
    SiVite,
    SiWebpack,
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
    {id: 'brand-microsoft', label: 'Microsoft', category: 'Brands', Icon: FaMicrosoft},
    {id: 'brand-github', label: 'GitHub', category: 'Brands', Icon: FaGithub},
    {id: 'brand-gitlab', label: 'GitLab', category: 'Brands', Icon: FaGitlab},
    {id: 'brand-docker', label: 'Docker', category: 'Brands', Icon: FaDocker},
    {id: 'brand-aws', label: 'AWS', category: 'Brands', Icon: FaAws},
    {id: 'brand-cloudflare', label: 'Cloudflare', category: 'Brands', Icon: FaCloudflare},
    {id: 'brand-mattermost', label: 'Mattermost', category: 'Brands', Icon: SiMattermost},
    {id: 'brand-slack', label: 'Slack', category: 'Brands', Icon: FaSlack},
    {id: 'brand-discord', label: 'Discord', category: 'Brands', Icon: FaDiscord},
    {id: 'brand-dropbox', label: 'Dropbox', category: 'Brands', Icon: FaDropbox},
    {id: 'brand-figma', label: 'Figma', category: 'Brands', Icon: FaFigma},
    {id: 'brand-jira', label: 'Jira', category: 'Brands', Icon: FaJira},
    {id: 'brand-trello', label: 'Trello', category: 'Brands', Icon: FaTrello},
    {id: 'brand-clickup', label: 'ClickUp', category: 'Brands', Icon: SiClickup},
    {id: 'brand-wordpress', label: 'WordPress', category: 'Brands', Icon: FaWordpress},
    {id: 'ai-sparkles', label: 'AI', category: 'AI & Tech', Icon: HiSparkles},
    {id: 'ai-bot', label: 'Bot', category: 'AI & Tech', Icon: LuBot},
    {id: 'ai-openai', label: 'OpenAI', category: 'AI & Tech', Icon: SiOpenai},
    {id: 'ai-gemini', label: 'Gemini', category: 'AI & Tech', Icon: SiGooglegemini},
    {id: 'ai-ollama', label: 'Ollama', category: 'AI & Tech', Icon: SiOllama},
    {id: 'tech-server', label: 'Server', category: 'AI & Tech', Icon: LuServer},
    {id: 'tech-network', label: 'Network', category: 'AI & Tech', Icon: LuNetwork},
    {id: 'tech-code', label: 'Code', category: 'AI & Tech', Icon: LuCode},
    {id: 'tech-react', label: 'React', category: 'AI & Tech', Icon: SiReact},
    {id: 'tech-nextjs', label: 'Next.js', category: 'AI & Tech', Icon: SiNextdotjs},
    {id: 'tech-vite', label: 'Vite', category: 'AI & Tech', Icon: SiVite},
    {id: 'tech-webpack', label: 'Webpack', category: 'AI & Tech', Icon: SiWebpack},
    {id: 'tech-svelte', label: 'Svelte', category: 'AI & Tech', Icon: SiSvelte},
    {id: 'tech-vue', label: 'Vue', category: 'AI & Tech', Icon: FaVuejs},
    {id: 'tech-tailwind', label: 'Tailwind CSS', category: 'AI & Tech', Icon: SiTailwindcss},
    {id: 'tech-typescript', label: 'TypeScript', category: 'AI & Tech', Icon: SiTypescript},
    {id: 'tech-go', label: 'Go', category: 'AI & Tech', Icon: SiGo},
    {id: 'tech-python', label: 'Python', category: 'AI & Tech', Icon: FaPython},
    {id: 'tech-php', label: 'PHP', category: 'AI & Tech', Icon: FaPhp},
    {id: 'tech-laravel', label: 'Laravel', category: 'AI & Tech', Icon: FaLaravel},
    {id: 'tech-django', label: 'Django', category: 'AI & Tech', Icon: SiDjango},
    {id: 'tech-flask', label: 'Flask', category: 'AI & Tech', Icon: SiFlask},
    {id: 'tech-fastapi', label: 'FastAPI', category: 'AI & Tech', Icon: SiFastapi},
    {id: 'tech-node', label: 'Node.js', category: 'AI & Tech', Icon: SiNodedotjs},
    {id: 'tech-npm', label: 'npm', category: 'AI & Tech', Icon: FaNpm},
    {id: 'tech-terminal', label: 'Terminal', category: 'AI & Tech', Icon: LuTerminal},
    {id: 'tech-cpu', label: 'CPU', category: 'AI & Tech', Icon: LuCpu},
    {id: 'tech-monitor', label: 'Monitor', category: 'AI & Tech', Icon: LuMonitor},
    {id: 'tech-linux', label: 'Linux', category: 'AI & Tech', Icon: FaLinux},
    {id: 'tech-ubuntu', label: 'Ubuntu', category: 'AI & Tech', Icon: FaUbuntu},
    {id: 'tech-kubernetes', label: 'Kubernetes', category: 'AI & Tech', Icon: SiKubernetes},
    {id: 'tech-terraform', label: 'Terraform', category: 'AI & Tech', Icon: SiTerraform},
    {id: 'tech-jenkins', label: 'Jenkins', category: 'AI & Tech', Icon: SiJenkins},
    {id: 'tech-nginx', label: 'Nginx', category: 'AI & Tech', Icon: SiNginx},
    {id: 'data-postgres', label: 'PostgreSQL', category: 'Data', Icon: SiPostgresql},
    {id: 'data-mysql', label: 'MySQL', category: 'Data', Icon: SiMysql},
    {id: 'data-redis', label: 'Redis', category: 'Data', Icon: SiRedis},
    {id: 'data-mongodb', label: 'MongoDB', category: 'Data', Icon: SiMongodb},
    {id: 'data-firebase', label: 'Firebase', category: 'Data', Icon: SiFirebase},
    {id: 'data-supabase', label: 'Supabase', category: 'Data', Icon: SiSupabase},
    {id: 'data-prisma', label: 'Prisma', category: 'Data', Icon: SiPrisma},
    {id: 'data-graphql', label: 'GraphQL', category: 'Data', Icon: SiGraphql},
    {id: 'data-elasticsearch', label: 'Elasticsearch', category: 'Data', Icon: SiElasticsearch},
    {id: 'data-database', label: 'Database', category: 'Data', Icon: LuDatabase},
    {id: 'data-hard-drive', label: 'Storage', category: 'Data', Icon: LuHardDrive},
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
    {id: 'work-briefcase', label: 'Briefcase', category: 'Work', Icon: LuBriefcase},
    {id: 'work-building', label: 'Company', category: 'Work', Icon: LuBuilding},
    {id: 'work-folder', label: 'Folder', category: 'Work', Icon: LuFolder},
    {id: 'work-file-text', label: 'Document', category: 'Work', Icon: LuFileText},
    {id: 'work-inbox', label: 'Inbox', category: 'Work', Icon: LuInbox},
    {id: 'work-layers', label: 'Layers', category: 'Work', Icon: LuLayers},
    {id: 'work-ticket', label: 'Ticket', category: 'Work', Icon: LuTicket},
    {id: 'work-tag', label: 'Tag', category: 'Work', Icon: LuTag},
    {id: 'work-star', label: 'Star', category: 'Work', Icon: LuStar},
    {id: 'work-book', label: 'Knowledge base', category: 'Work', Icon: LuBookOpen},
    {id: 'work-bell', label: 'Notification', category: 'Work', Icon: LuBell},
    {id: 'work-search', label: 'Search', category: 'Work', Icon: LuSearch},
    {id: 'work-filter', label: 'Filter', category: 'Work', Icon: LuFilter},
    {id: 'work-printer', label: 'Print', category: 'Work', Icon: LuPrinter},
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
    {id: 'action-upload', label: 'Upload', category: 'Actions', Icon: LuUpload},
    {id: 'action-download', label: 'Download', category: 'Actions', Icon: LuDownload},
    {id: 'action-send', label: 'Send', category: 'Actions', Icon: LuSend},
    {id: 'action-save', label: 'Save', category: 'Actions', Icon: LuSave},
    {id: 'action-delete', label: 'Delete', category: 'Actions', Icon: LuTrash2},
    {id: 'action-edit', label: 'Edit', category: 'Actions', Icon: LuPencil},
    {id: 'action-view', label: 'View', category: 'Actions', Icon: LuEye},
    {id: 'action-phone', label: 'Phone', category: 'Actions', Icon: LuPhone},
    {id: 'action-mail', label: 'Email', category: 'Actions', Icon: LuMail},
    {id: 'action-map', label: 'Map', category: 'Actions', Icon: LuMap},
    {id: 'action-location', label: 'Location', category: 'Actions', Icon: LuMapPin},
    {id: 'action-key', label: 'Key', category: 'Actions', Icon: LuKey},
    {id: 'action-qr', label: 'QR code', category: 'Actions', Icon: LuQrCode},
    {id: 'ops-mobile', label: 'Device farm', category: 'Operations', Icon: LuSmartphone},
    {id: 'ops-shield', label: 'Reliability', category: 'Operations', Icon: LuShieldCheck},
    {id: 'ops-test', label: 'Testing', category: 'Operations', Icon: LuTestTube},
    {id: 'ops-bug', label: 'Bug', category: 'Operations', Icon: FaBug},
    {id: 'ops-activity', label: 'Activity', category: 'Operations', Icon: LuActivity},
    {id: 'ops-users', label: 'Users', category: 'Operations', Icon: LuUsers},
    {id: 'ops-settings', label: 'Settings', category: 'Operations', Icon: LuSettings},
    {id: 'ops-wrench', label: 'Maintenance', category: 'Operations', Icon: LuWrench},
    {id: 'ops-gauge', label: 'Performance', category: 'Operations', Icon: LuGauge},
    {id: 'ops-timer', label: 'Timer', category: 'Operations', Icon: LuTimer},
    {id: 'ops-chart', label: 'Chart', category: 'Operations', Icon: LuChartBar},
    {id: 'ops-metrics', label: 'Metrics', category: 'Operations', Icon: LuChartNoAxesCombined},
    {id: 'ops-cloud', label: 'Cloud', category: 'Operations', Icon: LuCloud},
    {id: 'ops-cloud-upload', label: 'Cloud upload', category: 'Operations', Icon: LuCloudUpload},
    {id: 'ops-network-cable', label: 'Cable', category: 'Operations', Icon: LuCable},
    {id: 'ops-wifi', label: 'Wi-Fi', category: 'Operations', Icon: LuWifi},
    {id: 'ops-plug', label: 'Plug', category: 'Operations', Icon: LuPlug},
    {id: 'ops-package', label: 'Package', category: 'Operations', Icon: LuPackage},
    {id: 'ops-life-buoy', label: 'Support', category: 'Operations', Icon: LuLifeBuoy},
    {id: 'ops-zap', label: 'Automation', category: 'Operations', Icon: LuZap},
    {id: 'ops-prometheus', label: 'Prometheus', category: 'Operations', Icon: SiPrometheus},
    {id: 'ops-grafana', label: 'Grafana', category: 'Operations', Icon: SiGrafana},
    {id: 'ops-sentry', label: 'Sentry', category: 'Operations', Icon: SiSentry},
    {id: 'ops-datadog', label: 'Datadog', category: 'Operations', Icon: SiDatadog},
    {id: 'ops-rocket', label: 'Rocket', category: 'Operations', Icon: LuRocket},
    {id: 'business-wallet', label: 'Wallet', category: 'Business', Icon: LuWallet},
    {id: 'business-money', label: 'Revenue', category: 'Business', Icon: LuCircleDollarSign},
    {id: 'business-cart', label: 'Cart', category: 'Business', Icon: LuShoppingCart},
    {id: 'business-stripe', label: 'Stripe', category: 'Business', Icon: SiStripe},
    {id: 'business-megaphone', label: 'Marketing', category: 'Business', Icon: LuMegaphone},
    {id: 'business-clock', label: 'Schedule', category: 'Business', Icon: LuClock},
    {id: 'creative-canva', label: 'Canva', category: 'Creative', Icon: SiCanva},
    {id: 'creative-idea', label: 'Idea', category: 'Creative', Icon: FaRegLightbulb},
    {id: 'creative-calendar', label: 'Schedule', category: 'Creative', Icon: FaRegCalendarAlt},
    {id: 'creative-camera', label: 'Camera', category: 'Creative', Icon: LuCamera},
    {id: 'creative-palette', label: 'Design', category: 'Creative', Icon: LuPalette},
    {id: 'creative-puzzle', label: 'Puzzle', category: 'Creative', Icon: LuPuzzle},
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
        const IconComponent = storedIcon.Icon as React.ComponentType<{['aria-hidden']?: boolean}>
        return (
            <span
                className={`StoredIcon StoredIcon--library ${props.className || ''}`.trim()}
                title={storedIcon.label}
            >
                <IconComponent aria-hidden={true}/>
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
