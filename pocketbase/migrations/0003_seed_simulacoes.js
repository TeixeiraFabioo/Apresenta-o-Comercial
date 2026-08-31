migrate(
  (app) => {
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
    } catch (_) {
      return
    }

    const simulacoesCol = app.findCollectionByNameOrId('simulacoes')

    const samples = [
      {
        client_name: 'Roberto de Almeida Prado',
        client_document: '123.456.789-00',
        property_name: 'Residencial Reserva das Palmeiras',
        unit_description: 'Apto 142 - Torre Araucária',
        property_value: 480000,
        amount_paid: 240000,
        expected_delivery_date: '2024-12-15 00:00:00.000Z',
        contract_number: 'CTR-2023-8841',
        developer_name: 'Incorporadora Horizonte SPE Ltda.',
        notes:
          'Atraso na entrega das chaves superior a 180 dias de carência. Cliente interessado na rescisão com restituição integral e indenização.',
        status: 'apresentado',
      },
      {
        client_name: 'Mariana Guimarães Siqueira',
        client_document: '987.654.321-11',
        property_name: 'Condomínio Grand Palais Jardins',
        unit_description: 'Unidade Studio 703',
        property_value: 350000,
        amount_paid: 150000,
        expected_delivery_date: '2025-03-30 00:00:00.000Z',
        contract_number: 'CTR-GP-2022/45',
        developer_name: 'Nova York Construtora e Incorporadora',
        notes:
          'Apresentação inicial agendada para assinatura de procuração e contrato de honorários advocatícios.',
        status: 'em_negociacao',
      },
      {
        client_name: 'Carlos Eduardo Nogueira e Silva',
        client_document: '456.789.123-22',
        property_name: 'Edifício Infinity Tower Residence',
        unit_description: 'Cobertura Duplex 2101',
        property_value: 920000,
        amount_paid: 460000,
        expected_delivery_date: '2024-06-30 00:00:00.000Z',
        contract_number: 'INF-2021-0992',
        developer_name: 'Metrópole Empreendimentos Imobiliários S/A',
        notes: 'Contrato fechado. Petição inicial com pedido liminar em elaboração.',
        status: 'contrato_fechado',
      },
    ]

    for (const item of samples) {
      try {
        const existing = app.findRecordsByFilter(
          'simulacoes',
          `user = '${userRecord.id}' && client_name = '${item.client_name}'`,
          '',
          1,
          0,
        )
        if (existing.length > 0) continue
      } catch (_) {}

      const record = new Record(simulacoesCol)
      record.set('user', userRecord.id)
      record.set('client_name', item.client_name)
      record.set('client_document', item.client_document)
      record.set('property_name', item.property_name)
      record.set('unit_description', item.unit_description)
      record.set('property_value', item.property_value)
      record.set('amount_paid', item.amount_paid)
      record.set('expected_delivery_date', item.expected_delivery_date)
      record.set('contract_number', item.contract_number)
      record.set('developer_name', item.developer_name)
      record.set('notes', item.notes)
      record.set('status', item.status)
      app.save(record)
    }
  },
  (app) => {
    // rollback logic if needed
  },
)
