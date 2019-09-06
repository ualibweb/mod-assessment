import express, { Application, Request, Response, NextFunction } from 'express';
import { Client } from 'pg';
import mainClasses from './main-classes';
import assessment from './assessment';
import config from './config.json';

const app: Application = express();

app.locals.client = new Client(config.ldpDatabase);
app.locals.mainClasses = mainClasses;

app.use('/assessment', assessment);

// Error handler.
app.use((error: Error, request: Request, response: Response, next: NextFunction) => {
  response.sendStatus(500);
  console.error(error.stack);
});

// Connect to the LDP database and start listening.
app.locals.client.connect()
  .then(() => {
    app.listen(config.express.port, () => {
      console.log(`Assessment API listening on port ${config.express.port}!`);
    });
  })
  .catch((error: Error) => {
    console.error(error.stack);
    process.exit(1);
  });
