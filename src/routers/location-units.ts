import express from 'express';
import validator from 'validator';

const router = express.Router();

router.get('/institutions', (request: express.Request, response: express.Response, next) => {
  request.app.locals.client.query(`SELECT * FROM institutions`)
    .then(result => { response.json(result.rows); })
    .catch(error => { next(error); });
});

router.get('/campuses', (request: express.Request, response: express.Response, next) => {
  let institutionIds = request.query.institutionIds;

  if (institutionIds === undefined) {
    response.status(400).send('Missing query parameter');
    return;
  }

  // Validate the institution IDs.
  try {
    institutionIds = JSON.parse(institutionIds);
    for (let institutionId of institutionIds) if (!validator.isUUID(institutionId, 4)) throw new Error();
  } catch {
    response.status(400).send('Invalid query parameter');
    return;
  }

  request.app.locals.client.query(`SELECT id, name FROM campuses WHERE institutionId IN (${institutionIds.map((id: string) => `'${id}'`).toString()})`)
    .then(result => { response.json(result.rows); })
    .catch(error => { next(error); });
});

export default router;
