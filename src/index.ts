import express from 'express';
import { Client } from 'pg';
import config from './config';

const app = express();
const client: Client = new Client(config.pg);

// Connect to the LDP and start listening.
client.connect()
  .then(() => { app.listen(config.express.port, () => { console.log(`Assessment API listening on port ${config.express.port}!`); }); })
  .catch((error: Error) => {
    console.error(error.stack);
    process.exit(1);
  });
