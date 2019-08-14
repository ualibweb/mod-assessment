import { Request, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';
import arrayify from './arrayify';

export default function(request: Request, response: Response, next: NextFunction) {
  const queryText: string = `
    SELECT materialTypes.name as materialType, locations.libraryId, COUNT(DISTINCT instances.id) as titles, COUNT(*) as volumes
    FROM items
    LEFT JOIN holdings ON items.holdingsRecordId = holdings.id
    LEFT JOIN instances ON holdings.instanceId = instances.id
    LEFT JOIN materialTypes ON items.materialTypeId = materialTypes.id
    LEFT JOIN locations ON holdings.permanentLocationId = locations.id
    GROUP BY materialTypes.name, locations.libraryId
  `;

  request.app.locals.client.query(queryText).then((result: QueryResult) => {
    const materialTypes: any = {};

    result.rows.forEach((row: any) => {
      const {
        materialtype: materialType,
        libraryid: libraryId,
        titles,
        volumes
      }: any = row;

      if (materialTypes[materialType] === undefined) {
        materialTypes[materialType] = {
          counts: {}
        };
      }

      materialTypes[materialType].counts[libraryId] = {
        titles,
        volumes
      };
    });

    // Respond with the arrayified material types.
    response.json(arrayify(materialTypes, 'name'));
  });
};
