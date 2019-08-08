import { Router, Request, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';
import arrayify from './arrayify';

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
    const libraryCountsByLccNumber: any = {};

    result.rows.forEach((row: any) => {
      const {
        lccnumber: lccNumber,
        libraryid: libraryId,
        volumes
      }: any = row;
      const libraryCounts: any[] = libraryCountsByLccNumber[lccNumber];
      const newLibraryCount: any = {
        libraryId,
        volumes: Number(volumes)
      };

      if (libraryCounts === undefined) libraryCountsByLccNumber[lccNumber] = [newLibraryCount];
      else libraryCounts.push(newLibraryCount);
    });

    let mainClasses: any = request.app.locals.mainClasses;

    Object.entries(libraryCountsByLccNumber).forEach(([lccNumber, libraryCounts]: any[]) => {
      let leadingUppercaseLetters: string = '';

      // Get the leading uppercase letters.
      for (let i: number = 0; i < lccNumber.length; ++i) {
        const char: string = lccNumber.charAt(i);
        const charCode: number = lccNumber.charCodeAt(i);

        if (charCode >= 65 && charCode <= 90) leadingUppercaseLetters += char;
        else break;
      }

      const mainClass: any = mainClasses[leadingUppercaseLetters.charAt(0)];
      const subclass: any = mainClass.subclasses[leadingUppercaseLetters];

      // Count.
      libraryCounts.forEach(({libraryId, volumes}: any) => {
        if (subclass !== undefined) {
          if (subclass.counts[libraryId] === undefined) {
            subclass.counts[libraryId] = {
              titles: 0,
              volumes: 0
            };
          }

          ++subclass.counts[libraryId].titles;
          subclass.counts[libraryId].volumes += volumes;
        }

        if (mainClass.counts[libraryId] === undefined) {
          mainClass.counts[libraryId] = {
            titles: 0,
            volumes: 0
          };
        }

        ++mainClass.counts[libraryId].titles;
        mainClass.counts[libraryId].volumes += volumes;
      });
    });

    // Arrayify the main classes.
    mainClasses = arrayify(mainClasses, 'letter');

    // Arrayify the subclasses.
    mainClasses.forEach((mainClass: any) => {
      const subclasses: any = mainClass.subclasses;

      if (subclasses !== undefined) {
        mainClass.subclasses = arrayify(subclasses, 'letters');
      }
    });

    response.json(mainClasses);
    request.app.locals.mainClasses.clearCounts();
  });
});

export default assessment;
