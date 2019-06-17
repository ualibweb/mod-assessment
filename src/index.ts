import express from 'express';
import { Client } from 'pg';
import config from './config';

const app = express();
const client: Client = new Client(config.pg);

app.get('/assessment/location-units/institutions', (request: express.Request, response: express.Response) => {
  client.query(`SELECT * FROM institutions`)
    .then(result => {
      response.json(result.rows);
    })
    .catch(error => {
      response.sendStatus(500);
      console.error(error.stack);
    });
});

// Connect to the LDP and start listening.
client.connect()
  .then(() => { app.listen(config.express.port, () => { console.log(`Assessment API listening on port ${config.express.port}!`); }); })
  .catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
