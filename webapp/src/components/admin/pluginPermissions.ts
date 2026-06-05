// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type PluginPermission = {
    description: string
    id: string
}

export const PLUGIN_PERMISSIONS: PluginPermission[] = [
    {id: 'board.read', description: 'Read boards, board metadata, board members, and board views the current user can access.'},
    {id: 'board.write', description: 'Update board metadata, properties, views, and board configuration the current user can edit.'},
    {id: 'board.create', description: 'Create boards in teams or workspaces available to the current user.'},
    {id: 'board.delete', description: 'Delete or restore boards when the current user has board delete permission.'},
    {id: 'board.share', description: 'Read and update board sharing settings when the current user can share the board.'},
    {id: 'board.members.read', description: 'Read members and roles for boards the current user can access.'},
    {id: 'board.members.write', description: 'Invite, remove, or update board member roles when the current user can manage roles.'},
    {id: 'task.read', description: 'Read task cards and card content from boards the current user can access.'},
    {id: 'task.write', description: 'Create, update, move, archive, or delete task cards when the current user can edit cards.'},
    {id: 'task.comment', description: 'Create card comments when the current user can comment on cards.'},
    {id: 'task.attachment.read', description: 'Read task attachment metadata and download files visible to the current user.'},
    {id: 'task.attachment.write', description: 'Upload or remove task attachments when the current user can edit cards.'},
    {id: 'template.read', description: 'Read board templates available to the current user.'},
    {id: 'template.write', description: 'Create, update, or remove board templates. Requires admin-level access.'},
    {id: 'user.read', description: 'Read registered user profile fields exposed to BoringBoard.'},
    {id: 'team.read', description: 'Read teams, workspaces, and team membership visible to the current user.'},
    {id: 'activity.read', description: 'Read activity logs. Requires admin-level access for global logs.'},
    {id: 'announcement.read', description: 'Read announcement module data.'},
    {id: 'announcement.write', description: 'Create, update, or remove announcements. Requires admin-level access.'},
    {id: 'reminder.read', description: 'Read reminder module data.'},
    {id: 'reminder.write', description: 'Create, update, or remove reminders. Requires admin-level access.'},
    {id: 'notification.send', description: 'Send notifications through enabled BoringBoard notification media.'},
    {id: 'settings.read', description: 'Read system settings exposed to the plugin runtime.'},
    {id: 'settings.write', description: 'Update system settings exposed to the plugin runtime. Requires admin-level access.'},
    {id: 'storage.read', description: 'Read plugin-owned persistent storage.'},
    {id: 'storage.write', description: 'Write plugin-owned persistent storage.'},
    {id: 'socket.subscribe', description: 'Subscribe to plugin runtime socket events.'},
    {id: 'socket.publish', description: 'Publish plugin runtime socket events.'},
    {id: 'http.request', description: 'Make outbound HTTP requests through the controlled plugin runtime proxy.'},
    {id: 'ai.generate', description: 'Request AI generation through BoringBoard AI tools when enabled for the current user.'},
]

export const PLUGIN_PERMISSION_IDS = new Set(PLUGIN_PERMISSIONS.map((permission) => permission.id))
