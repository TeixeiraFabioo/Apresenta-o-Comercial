migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('simulacoes')

    // 1. Data de referência do cálculo (date)
    if (!col.fields.getByName('reference_date')) {
      col.fields.add(
        new DateField({
          name: 'reference_date',
          required: false,
        }),
      )
    }

    // 2. Alíquota de custas judiciais em percentual (number, default 3)
    if (!col.fields.getByName('custas_rate')) {
      col.fields.add(
        new NumberField({
          name: 'custas_rate',
          required: false,
          min: 0,
          max: 100,
        }),
      )
    }

    // 3. Flag para habilitar correção monetária (bool, não-required)
    if (!col.fields.getByName('correction_enabled')) {
      col.fields.add(
        new BoolField({
          name: 'correction_enabled',
          required: false,
        }),
      )
    }

    // 4. Índice de correção monetária (select: inpc, igpm, ipca_e)
    if (!col.fields.getByName('correction_index')) {
      col.fields.add(
        new SelectField({
          name: 'correction_index',
          required: false,
          values: ['inpc', 'igpm', 'ipca_e'],
          maxSelect: 1,
        }),
      )
    }

    // 5. Taxa mensal de juros / correção em percentual (number, ex. 1.0)
    if (!col.fields.getByName('correction_rate')) {
      col.fields.add(
        new NumberField({
          name: 'correction_rate',
          required: false,
          min: 0,
          max: 100,
        }),
      )
    }

    // 6. Data inicial da correção monetária (date)
    if (!col.fields.getByName('correction_start_date')) {
      col.fields.add(
        new DateField({
          name: 'correction_start_date',
          required: false,
        }),
      )
    }

    app.save(col)

    // Backfill seguro para registros existentes
    try {
      app.db().newQuery('UPDATE simulacoes SET custas_rate = 3 WHERE custas_rate IS NULL').execute()
    } catch (_) {}

    try {
      app
        .db()
        .newQuery('UPDATE simulacoes SET correction_enabled = 0 WHERE correction_enabled IS NULL')
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('simulacoes')
      col.fields.removeByName('reference_date')
      col.fields.removeByName('custas_rate')
      col.fields.removeByName('correction_enabled')
      col.fields.removeByName('correction_index')
      col.fields.removeByName('correction_rate')
      col.fields.removeByName('correction_start_date')
      app.save(col)
    } catch (_) {}
  },
)
