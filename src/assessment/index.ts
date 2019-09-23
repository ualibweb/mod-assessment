import { Router } from 'express';
import getLocationUnits from './get-location-units';
import getCollectionsByLccNumber from './get-collections-by-lcc-number';
import getCollectionsByMaterialType from './get-collections-by-material-type';
import getCirculationByLccNumber from './get-circulation-by-lcc-number';
import getCirculationByMaterialType from './get-circulation-by-material-type';
import getCirculationByPatronGroup from './get-circulation-by-patron-group';

const assessment = Router();

assessment.get('/location-units', getLocationUnits);
assessment.get('/collections-by-lcc-number', getCollectionsByLccNumber);
assessment.get('/collections-by-material-type', getCollectionsByMaterialType);
assessment.get('/circulation-by-lcc-number', getCirculationByLccNumber);
assessment.get('/circulation-by-material-type', getCirculationByMaterialType);
assessment.get('/circulation-by-patron-group', getCirculationByPatronGroup);

export default assessment;
