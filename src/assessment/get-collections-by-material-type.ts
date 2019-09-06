import { Request, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';
import arrayify from './arrayify';

export default function(request: Request, response: Response, next: NextFunction) {
  const queryText: string = `
    SELECT material_type, ARRAY_AGG(library_id) AS library_ids, ARRAY_AGG(titles) AS titles, ARRAY_AGG(volumes) AS volumes
    FROM (
      SELECT material_types.name as material_type, locations.library_id, COUNT(DISTINCT instances.id) as titles, COUNT(items.id) as volumes
      FROM items
      LEFT JOIN holdings ON items.holdings_record_id = holdings.id
      LEFT JOIN instances ON holdings.instance_id = instances.id
      LEFT JOIN material_types ON items.data ->> 'materialTypeId' = material_types.id
      LEFT JOIN locations ON holdings.permanent_location_id = locations.id
      GROUP BY material_types.name, locations.library_id
    ) AS material_type_library_combinations
    GROUP BY material_type
  `;

  request.app.locals.client.query(queryText)
    .then((result: QueryResult) => {
      const materialTypes: any = {};

      result.rows.forEach((row: any) => {
        const {
          material_type: materialType,
          library_ids: libraryIds,
          titles,
          volumes
        }: any = row;

        materialTypes[materialType] = {
          counts: {}
        };

        for (let i = 0; i < libraryIds.length; ++i) {
          materialTypes[materialType].counts[libraryIds[i]] = {
            titles: titles[i],
            volumes: volumes[i]
          };
        }
      });

      // Respond with the arrayified material types.
      response.json(arrayify(materialTypes, 'name'));
    });
};
