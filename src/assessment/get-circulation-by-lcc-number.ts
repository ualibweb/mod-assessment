import { Request, Response, NextFunction } from 'express';
import { Client, QueryResult } from 'pg';
import moment from 'moment';
import arrayify from './arrayify';

export default function(request: Request, response: Response, next: NextFunction) {
  const dateFormat: string = 'YYYY-MM-DD';
  const {from, to} = request.query;

  let responseText: string;

  if (!from || !to) {
    responseText = 'Missing query parameter(s)';
  } else {
    const fromMoment = moment(from, dateFormat, true);
    const toMoment = moment(to, dateFormat, true);

    if (!fromMoment.isValid() || !toMoment.isValid() || fromMoment.isAfter(toMoment)) {
      responseText = 'Invalid query parameter(s)';
    }
  }

  if (responseText !== undefined) {
    response.status(400).send(responseText);
  } else {
    const client: Client = request.app.locals.client;
    const queries: Promise<QueryResult>[] = [
      client.query("SELECT id from classification_types WHERE name = 'LC'"),
      client.query(`
        SELECT instances.data -> 'classifications' as classifications, aggregated_instances.library_ids, aggregated_instances.checkouts, aggregated_instances.renewals
        FROM (
          SELECT id, ARRAY_AGG(library_id) AS library_ids, ARRAY_AGG(checkouts) AS checkouts, ARRAY_AGG(renewals) AS renewals
          FROM (
            SELECT instances.id, locations.library_id, COUNT(loans.id) AS checkouts, SUM(loans.renewal_count) as renewals
            FROM loans
            LEFT JOIN items ON loans.item_id = items.id
            LEFT JOIN holdings ON items.holdings_record_id = holdings.id
            LEFT JOIN instances ON holdings.instance_id = instances.id
            LEFT JOIN locations ON holdings.permanent_location_id = locations.id
            WHERE loans.loan_date >= '${from}' AND loans.loan_date <= '${to}'
            GROUP BY instances.id, locations.library_id
          ) AS instance_library_combinations
          GROUP BY id
        ) AS aggregated_instances
        LEFT JOIN instances ON aggregated_instances.id = instances.id
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
            checkouts,
            renewals
          }: any = row;

          const numerifiedRenewals: number = Number(renewals);

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
                      checkouts: 0,
                      renewals: 0
                    };
                  }

                  ++subclass.counts[libraryId].checkouts;
                  subclass.counts[libraryId].renewals += numerifiedRenewals;
                }

                if (mainClass.counts[libraryId] === undefined) {
                  mainClass.counts[libraryId] = {
                    checkouts: 0,
                    renewals: 0
                  };
                }

                ++mainClass.counts[libraryId].checkouts;
                mainClass.counts[libraryId].renewals += numerifiedRenewals;
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
  }
};
