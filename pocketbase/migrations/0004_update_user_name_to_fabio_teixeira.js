migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
      record.set('name', 'Dr. Fábio Teixeira')
      app.save(record)
    } catch (_) {}
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
      record.set('name', 'Dr. Fabio Santos')
      app.save(record)
    } catch (_) {}
  },
)
