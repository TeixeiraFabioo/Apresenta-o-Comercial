migrate(
  (app) => {
    const collection = new Collection({
      name: 'simulacoes',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'client_name',
          type: 'text',
          required: true,
        },
        {
          name: 'client_document',
          type: 'text',
        },
        {
          name: 'property_name',
          type: 'text',
          required: true,
        },
        {
          name: 'unit_description',
          type: 'text',
        },
        {
          name: 'property_value',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'amount_paid',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'expected_delivery_date',
          type: 'date',
          required: true,
        },
        {
          name: 'contract_number',
          type: 'text',
        },
        {
          name: 'developer_name',
          type: 'text',
        },
        {
          name: 'notes',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['em_negociacao', 'apresentado', 'contrato_fechado', 'em_andamento', 'arquivado'],
          maxSelect: 1,
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
        'CREATE INDEX idx_simulacoes_user_created ON simulacoes (user, created DESC)',
        'CREATE INDEX idx_simulacoes_client_name ON simulacoes (client_name)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('simulacoes')
      app.delete(collection)
    } catch (_) {}
  },
)
