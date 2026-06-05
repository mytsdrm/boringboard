module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name || 'Example Plugin',
        description: 'Starter plugin using BoringBoard default SDK helpers.',
    })

    plugin.createCard({
        title: 'Quick action',
        description: 'Run a plugin function or call a built-in BoringBoard API.',
        actions: [
            {
                label: 'Sync tasks',
                run: () => plugin.exec('syncTasks'),
            },
            {
                label: 'Load my profile',
                run: () => plugin.exec('loadProfile'),
            },
        ],
    })

    plugin.createTable({
        columns: ['Task', 'Owner', 'Status'],
        rows: [
            ['Follow up customer', 'Ari', 'Open'],
            ['Prepare weekly report', 'Mika', 'In progress'],
            ['Review blocked tasks', 'Dina', 'Needs help'],
        ],
    })

    plugin.register('syncTasks', () => {
        plugin.log('Example Plugin synced 3 task rows.')
    })

    plugin.register('loadProfile', async () => {
        const me = await plugin.api.get('/api/v2/users/me')
        plugin.log('Loaded profile: ' + (me.username || me.id || 'current user'))
    })
}
