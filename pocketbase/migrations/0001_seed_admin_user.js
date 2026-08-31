migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('fabio.saantost@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Dr. Fabio Santos')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
