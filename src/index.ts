import express from 'express';
import { Client } from 'pg';
import locationUnits from './routers/location-units';
import config from './config';

const app = express();

app.use('/assessment/location-units', locationUnits);
app.use((error, request: express.Request, response: express.Response, next) => {
  response.sendStatus(500);
  console.error(error.stack);
});

app.locals.client = new Client(config.pg);

// Connect to the LDP and start listening.
app.locals.client.connect()
  .then(() => { app.listen(config.express.port, () => { console.log(`Assessment API listening on port ${config.express.port}!`); }); })
  .catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
