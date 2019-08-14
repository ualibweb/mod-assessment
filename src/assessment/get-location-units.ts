import { Request, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';

export default function(request: Request, response: Response, next: NextFunction) {
  request.app.locals.client.query(`SELECT * FROM institutions`)
    .then((result: QueryResult) => {
      const institutions: Array<Promise<any>> = [];

      result.rows.forEach((institution: any) => {
        institutions.push(new Promise((resolve: Function, reject: Function) => {
          request.app.locals.client.query(`SELECT id, name FROM campuses WHERE institutionId = '${institution.id}'`)
            .then((result: QueryResult) => {
              const campuses: Array<Promise<any>> = [];

              result.rows.forEach((campus: any) => {
                campuses.push(new Promise((resolve: Function, reject: Function) => {
                  request.app.locals.client.query(`SELECT id, name FROM libraries WHERE campusId = '${campus.id}'`)
                    .then((result: QueryResult) => {
                      campus.libraries = result.rows;
                      resolve(campus);
                    }).catch((error: Error) => { reject(error); });
                }));
              });

              return Promise.all(campuses);
            }).then((campuses: Array<any>) => {
              institution.campuses = campuses;
              resolve(institution);
            }).catch((error: Error) => { reject(error); })
        }));
      });

      return Promise.all(institutions);
    }).then((institutions: Array<any>) => { response.json(institutions); })
    .catch((error: Error) => { next(error); });
};
