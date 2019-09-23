import { Request, Response, NextFunction } from 'express';
import moment from 'moment';
import { Client, QueryResult } from 'pg';
import arrayify from './arrayify';

export default function(request: Request, response: Response, next: NextFunction) {
  const dateFormat: string = 'YYYY-MM-DD';
  const {from, to}: any = request.query;

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
    const queryText: string = `
      SELECT patron_group, ARRAY_AGG(library_id) AS library_ids, ARRAY_AGG(checkouts) AS checkouts, ARRAY_AGG(renewals) AS renewals
      FROM (
        SELECT groups.group as patron_group, locations.library_id, COUNT(loans.id) as checkouts, SUM(loans.renewal_count) as renewals
        FROM loans
        LEFT JOIN users ON loans.user_id = users.id
        LEFT JOIN groups ON users.patron_group = groups.id
        LEFT JOIN items ON loans.item_id = items.id
        LEFT JOIN holdings ON items.holdings_record_id = holdings.id
        LEFT JOIN locations ON holdings.permanent_location_id = locations.id
        WHERE loans.loan_date >= '${from}' AND loans.loan_date <= '${to}'
        GROUP BY groups.group, locations.library_id
      ) AS patron_group_library_combinations
      GROUP BY patron_group
    `;

    request.app.locals.client.query(queryText)
      .then((result: QueryResult) => {
        const patronGroups: any = {};

        result.rows.forEach((row: any) => {
          const {
            patron_group: patronGroup,
            library_ids: libraryIds,
            checkouts,
            renewals
          }: any = row;

          patronGroups[patronGroup] = {
            counts: {}
          };

          for (let i = 0; i < libraryIds.length; ++i) {
            patronGroups[patronGroup].counts[libraryIds[i]] = {
              checkouts: Number(checkouts[i]),
              renewals: Number(renewals[i])
            };
          }
        });

        // Respond with the arrayified material types.
        response.json(arrayify(patronGroups, 'name'));
      });
  }
};
