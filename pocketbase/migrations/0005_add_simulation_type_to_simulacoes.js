migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('simulacoes')

    if (!col.fields.getByName('simulation_type')) {
      col.fields.add(
        new SelectField({
          name: 'simulation_type',
          required: false,
          values: ['rescisao_contratual', 'indenizacao_atraso'],
          maxSelect: 1,
        }),
      )
      app.save(col)
    }

    // Preenche registros existentes com o valor padrão caso estejam nulos
    try {
      app
        .db()
        .newQuery(
          "UPDATE simulacoes SET simulation_type = 'rescisao_contratual' WHERE simulation_type IS NULL OR simulation_type = ''",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('simulacoes')
      col.fields.removeByName('simulation_type')
      app.save(col)
    } catch (_) {}
  },
)
