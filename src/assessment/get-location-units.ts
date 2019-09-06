import { Request, Response, NextFunction } from 'express';
import { Client, QueryResult } from 'pg';

export default function(request: Request, response: Response, next: NextFunction) {
  const client: Client = request.app.locals.client;

  client.query(`SELECT * FROM institutions`)
    .then((result: QueryResult) => {
      const institutionPromises: Promise<any>[] = [];

      result.rows.forEach((institution: any) => {
        institutionPromises.push(new Promise((resolve: Function, reject: Function) => {
          client.query(`SELECT id, name FROM campuses WHERE institution_id = '${institution.id}'`)
            .then((result: QueryResult) => {
              const campusPromises: Promise<any>[] = [];

              result.rows.forEach((campus: any) => {
                campusPromises.push(new Promise((resolve: Function, reject: Function) => {
                  client.query(`SELECT id, name FROM libraries WHERE campus_id = '${campus.id}'`)
                    .then((result: QueryResult) => {
                      campus.libraries = result.rows;
                      resolve(campus);
                    })
                    .catch((error: Error) => {
                      reject(error);
                    });
                }));
              });

              return Promise.all(campusPromises);
            })
            .then((campuses: Array<any>) => {
              institution.campuses = campuses;
              resolve(institution);
            })
            .catch((error: Error) => {
              reject(error);
            });
        }));
      });

      return Promise.all(institutionPromises);
    })
    .then((institutions: any[]) => {
      response.json(institutions);
    })
    .catch((error: Error) => {
      next(error);
    });
};
