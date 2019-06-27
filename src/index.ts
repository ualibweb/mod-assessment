import express from 'express';
import { Client } from 'pg';
import locationUnits from './routers/location-units';
import QueryParameterError from './query-parameter-error';
import config from './config';

const app: express.Application = express();

app.use('/assessment/location-units', locationUnits);
app.use((error: Error, request: express.Request, response: express.Response, next: Function) => {
  if (error instanceof QueryParameterError) response.sendStatus(400);
  else response.sendStatus(500);

  console.error(error.stack);
});

app.locals.client = new Client(config.pg);

// Connect to the LDP and start listening.
app.locals.client.connect()
  .then(() => { app.listen(config.express.port, () => { console.log(`Assessment API listening on port ${config.express.port}!`); }); })
  .catch((error: Error) => {
    console.error(error.stack);
    process.exit(1);
  });
