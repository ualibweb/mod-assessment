import express from 'express';
import pg from 'pg';
import validator from 'validator';
import QueryParameterError from '../query-parameter-error';

const router = express.Router();

router.get('/institutions', (request: express.Request, response: express.Response, next: express.NextFunction) => {
  request.app.locals.client.query(`SELECT * FROM institutions`)
    .then((result: pg.QueryResult) => { response.json(result.rows); })
    .catch((error: Error) => { next(error); });
});

router.get('/campuses', (request: express.Request, response: express.Response, next: express.NextFunction) => {
  try {
    const serializedInstitutionIds: string = request.query.institutionIds;

    // Check for institution IDs.
    if (serializedInstitutionIds === undefined) throw new Error();

    // Validate the institution IDs.
    const institutionIds: Array<string> = JSON.parse(serializedInstitutionIds);
    institutionIds.forEach((id: string) => { if (!validator.isUUID(id, 4)) throw new Error(); });

    request.app.locals.client.query(`SELECT id, name FROM campuses WHERE institutionId IN (${institutionIds.map((id: string) => `'${id}'`).toString()})`)
      .then((result: pg.QueryResult) => { response.json(result.rows); })
      .catch((error: Error) => { next(error); });
  } catch {
    next(new QueryParameterError());
  }
});

export default router;
