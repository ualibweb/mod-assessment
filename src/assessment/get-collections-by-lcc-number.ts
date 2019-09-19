import { Request, Response, NextFunction } from 'express';
import { Client, QueryResult } from 'pg';
import arrayify from './arrayify';

export default function(request: Request, response: Response, next: NextFunction) {
  const client: Client = request.app.locals.client;
  const queries: Promise<QueryResult>[] = [
    client.query("SELECT id from classification_types WHERE name = 'LC'"),
    client.query(`
      SELECT instances.data -> 'classifications' as classifications, aggregated_instances.library_ids, aggregated_instances.volumes
      FROM (
        SELECT id, ARRAY_AGG(library_id) AS library_ids, ARRAY_AGG(volumes) as volumes
        FROM (
          SELECT instances.id, locations.library_id, count(items.id) as volumes
          FROM items
          LEFT JOIN holdings ON items.holdings_record_id = holdings.id
          LEFT JOIN instances ON holdings.instance_id = instances.id
          LEFT JOIN locations ON holdings.permanent_location_id = locations.id
          GROUP BY instances.id, locations.library_id
        ) AS instance_library_combinations
        GROUP BY id
      ) AS aggregated_instances
      LEFT JOIN instances on aggregated_instances.id = instances.id
    `)
  ];

  Promise.all(queries)
    .then((results: QueryResult[]) => {
      const lccId: string = results[0].rows[0].id;
      let mainClasses: any = request.app.locals.mainClasses;

      results[1].rows.forEach((row: any) => {
        const {
          classifications,
          library_ids: libraryIds,
          volumes
        }: any = row;
        const numerifiedVolumes: number = Number(volumes);

        for (let i: number = 0; i < classifications.length; ++i) {
          const classification: any = classifications[i];

          if (classification.classificationTypeId === lccId) {
            const lccNumber: string = classification.classificationNumber;
            let leadingUppercaseLetters: string = '';

            for (let j: number = 0; j < lccNumber.length; ++j) {
              const char: string = lccNumber.charAt(j);
              const charCode: number = lccNumber.charCodeAt(j);

              if (charCode >= 65 && charCode <= 90) {
                leadingUppercaseLetters += char;
              } else break;
            }

            const mainClass: any = mainClasses[leadingUppercaseLetters.charAt(0)];
            const subclass: any = mainClass.subclasses[leadingUppercaseLetters];

            for (let j: number = 0; j < row.library_ids.length; ++j) {
              const libraryId: string = libraryIds[j];

              if (subclass !== undefined) {
                if (subclass.counts[libraryId] === undefined) {
                  subclass.counts[libraryId] = {
                    titles: 0,
                    volumes: 0
                  };
                }

                ++subclass.counts[libraryId].titles;
                subclass.counts[libraryId].volumes += numerifiedVolumes;
              }

              if (mainClass.counts[libraryId] === undefined) {
                mainClass.counts[libraryId] = {
                  titles: 0,
                  volumes: 0
                };
              }

              ++mainClass.counts[libraryId].titles;
              mainClass.counts[libraryId].volumes += numerifiedVolumes;
            }

            break;
          }
        }
      });

      mainClasses = arrayify(mainClasses, 'letter');
      mainClasses.forEach((mainClass: any) => {
        mainClass.subclasses = arrayify(mainClass.subclasses, 'letters');
      });

      response.json(mainClasses);
      request.app.locals.mainClasses.clearCounts();
    })
    .catch((error: Error) => {
      next(error);
    });
};
