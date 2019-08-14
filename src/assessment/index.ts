import { Router } from 'express';
import getLocationUnits from './get-location-units';
import getCollectionsByLccNumber from './get-collections-by-lcc-number';
import getCollectionsByMaterialType from './get-collections-by-material-type';

const assessment = Router();

assessment.get('/location-units', getLocationUnits);
assessment.get('/collections-by-lcc-number', getCollectionsByLccNumber);
assessment.get('/collections-by-material-type', getCollectionsByMaterialType);

export default assessment;
