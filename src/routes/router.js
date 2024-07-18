import { Router } from 'express';
import { DatabaseRepository } from '../repositories/databaseRepository.js';
import { ConnectDatabaseUseCase } from '../usecases/connectDatabaseUseCase.js';
import { SwitchDatabaseUseCase } from '../usecases/switchDatabaseUseCase.js';
import { CreateDatabaseUseCase } from '../usecases/createDatabaseUseCase.js';
import { CreateTableUseCase } from '../usecases/createTableUseCase.js';
import { InsertDataUseCase } from '../usecases/insertDataUseCase.js';
import { GetDatabasesUseCase } from '../usecases/getDatabasesUseCase.js';
import { DatabaseController } from '../controllers/databaseController.js';

const router = Router();

const databaseRepository = new DatabaseRepository();
const connectDatabaseUseCase = new ConnectDatabaseUseCase(databaseRepository);
const switchDatabaseUseCase = new SwitchDatabaseUseCase(databaseRepository);
const createDatabaseUseCase = new CreateDatabaseUseCase(databaseRepository);
const createTableUseCase = new CreateTableUseCase(databaseRepository);
const insertDataUseCase = new InsertDataUseCase(databaseRepository);
const getDatabasesUseCase = new GetDatabasesUseCase(databaseRepository);

const databaseController = new DatabaseController(
  createDatabaseUseCase,
  createTableUseCase,
  insertDataUseCase,
  switchDatabaseUseCase,
  getDatabasesUseCase,
  connectDatabaseUseCase // Corrige el orden de los parámetros
);

router.post('/connect', (req, res) => databaseController.connect(req, res));
router.post('/switch-database', (req, res) => databaseController.switchDatabase(req, res));
router.get('/databases', (req, res) => databaseController.getDatabases(req, res));
router.post('/create-database', (req, res) => databaseController.createDatabase(req, res));
router.post('/create-table', (req, res) => databaseController.createTable(req, res));
router.post('/insert-data', (req, res) => databaseController.insertData(req, res));

export default router;