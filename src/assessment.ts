import { Router, Request, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';

const assessment = Router();

assessment.get('/location-units', (request: Request, response: Response, next: NextFunction) => {
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
});

assessment.get('/collections-by-lcc-number', (request: Request, response: Response, next: NextFunction) => {
  request.app.locals.client.query(`SELECT id FROM libraries`).then((result: QueryResult) => {
    const queryText: string = `
      SELECT instances.lccNumber, locations.libraryId, COUNT(*) as volumes
      FROM items
      LEFT JOIN holdings ON items.holdingsRecordId = holdings.id
      LEFT JOIN instances ON holdings.instanceId = instances.id
      LEFT JOIN locations ON holdings.permanentLocationId = locations.id
      WHERE lccNumber IS NOT NULL
      GROUP BY instances.lccNumber, locations.libraryId
    `;

    request.app.locals.client.query(queryText).then((result: QueryResult) => {
      const lccNumbers: any = {};

      result.rows.forEach((row: any) => {
        const lccNumber: any = lccNumbers[row.lccNumber];
        const newValue: any = {
          libraryId: row.libraryid,
          volumes: row.volumes
        };

        if (lccNumber === undefined) lccNumbers[row.lccnumber] = [newValue];
        else lccNumber.push(newValue);
      });

      const mainClasses: any = request.app.locals.mainClasses;

      Object.entries(lccNumbers).forEach(([lccNumber, value]: Array<any>) => {
        const counts: any = mainClasses[lccNumber.charAt(0)].counts;

        // Count.
        value.forEach(({libraryId, volumes}: any) => {
          const library: any = counts[libraryId];
          const numberifiedVolumes = Number(volumes);

          if (library === undefined) counts[libraryId] = {
            titles: 1,
            volumes: numberifiedVolumes
          };
          else {
            ++library.titles;
            library.volumes += numberifiedVolumes
          }
        });
      });

      // Arrayify the main classes and sort them alphabetically by letter.
      const arrayifiedMainClasses: Array<any> = Object.entries(mainClasses).map(([letter, value]: Array<any>) => ({
        letter,
        ...value
      })).sort((mainClass1: any, mainClass2: any) => {
        const letter1: string = mainClass1.letter;
        const letter2: string = mainClass2.letter;
        return letter1 < letter2 ? -1 : letter1 > letter2 ? 1 : 0;
      });

      response.json(arrayifiedMainClasses);
      mainClasses.clearCounts();
    });
  });
});

export default assessment;
