migrate(
  (app) => {
    const simulacoesCol = app.findCollectionByNameOrId('simulacoes')

    const historyCol = new Collection({
      name: 'status_history',
      type: 'base',
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [
        {
          name: 'simulation',
          type: 'relation',
          required: true,
          collectionId: simulacoesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'previous_status',
          type: 'text',
          required: false,
        },
        {
          name: 'new_status',
          type: 'text',
          required: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_status_history_sim_created ON status_history (simulation, created DESC)',
        'CREATE INDEX idx_status_history_user ON status_history (user)',
      ],
    })

    app.save(historyCol)
  },
  (app) => {
    try {
      const historyCol = app.findCollectionByNameOrId('status_history')
      app.delete(historyCol)
    } catch (_) {}
  },
)
