migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('simulacoes')

    // 1. Campo de arquivo para o contrato original (PDF, JPG, PNG, max 5MB)
    if (!col.fields.getByName('contract_file')) {
      col.fields.add(
        new FileField({
          name: 'contract_file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        }),
      )
    }

    // 2. Campo de fundamentação customizada para a apresentação impressa
    if (!col.fields.getByName('custom_fundamentacao')) {
      col.fields.add(
        new TextField({
          name: 'custom_fundamentacao',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('simulacoes')
      col.fields.removeByName('contract_file')
      col.fields.removeByName('custom_fundamentacao')
      app.save(col)
    } catch (_) {}
  },
)
