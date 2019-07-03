import express from 'express';
import pg, { Client } from 'pg';
import config from './config';

const app: express.Application = express();

app.get('/assessment/location-units', (request: express.Request, response: express.Response, next: express.NextFunction) => {
  request.app.locals.client.query(`SELECT * FROM institutions`)
    .then((result: pg.QueryResult) => {
      const promises: Array<Promise<any>> = [];

      result.rows.forEach((row: any) => {
        promises.push(new Promise((resolve: Function, reject: Function) => {
          request.app.locals.client.query(`SELECT id, name FROM campuses WHERE institutionId = '${row.id}'`)
            .then((result: pg.QueryResult) => {
              row.campuses = result.rows;
              resolve(row);
            }).catch((error: Error) => { reject(error); })
        }));
      });

      return Promise.all(promises);
    }).then((rows: Array<any>) => { response.json(rows); })
    .catch((error: Error) => { next(error); });
});

// Error handler.
app.use((error: Error, request: express.Request, response: express.Response, next: Function) => {
  response.sendStatus(500);
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
