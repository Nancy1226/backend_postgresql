import { Router } from 'express';
import { DatabaseRepository } from '../repositories/databaseRepository.js';
import { ConnectDatabaseUseCase } from '../usecases/connectDatabaseUseCase.js';
import { SwitchDatabaseUseCase } from '../usecases/switchDatabaseUseCase.js';
import { CreateTableUseCase } from '../usecases/createTableUseCase.js';
import { InsertDataUseCase } from '../usecases/insertDataUseCase.js';
import { GetDatabasesUseCase } from '../usecases/getDatabasesUseCase.js';
import { DatabaseUseCase } from '../usecases/databaseUseCase.js';
import { GetTablesUseCase } from '../usecases/getTablesUseCase.js';
import { SelectDataUseCase } from '../usecases/selectDataUseCase.js';
import { DatabaseController } from '../controllers/databaseController.js';


const router = Router();

const databaseRepository = new DatabaseRepository();
const connectDatabaseUseCase = new ConnectDatabaseUseCase(databaseRepository);
const switchDatabaseUseCase = new SwitchDatabaseUseCase(databaseRepository);
const createTableUseCase = new CreateTableUseCase(databaseRepository);
const selectDataUseCase = new SelectDataUseCase(databaseRepository)
const getTablesUseCase = new GetTablesUseCase(databaseRepository);
const insertDataUseCase = new InsertDataUseCase(databaseRepository);
const getDatabasesUseCase = new GetDatabasesUseCase(databaseRepository);
const databaseUseCase = new DatabaseUseCase(databaseRepository)

const databaseController = new DatabaseController(
  databaseUseCase,
  createTableUseCase,
  getTablesUseCase,
  insertDataUseCase,
  switchDatabaseUseCase,
  getDatabasesUseCase,
  selectDataUseCase,
  connectDatabaseUseCase // Corrige el orden de los parámetros
);

router.post('/connect', (req, res) => databaseController.connect(req, res));
router.post('/database', (req, res) => databaseController.handleDatabaseOperation(req, res));
router.get('/databases', (req, res) => databaseController.getDatabases(req, res));
router.post('/switch-database', (req, res) => databaseController.switchDatabase(req, res));
router.post('/table', (req, res) => databaseController.createTable(req, res));
router.get('/tables', (req, res) => databaseController.getTables(req, res));
router.post('/data-operation', (req, res) => databaseController.createTable(req, res));
router.post('/select-operation', (req, res) => databaseController.handleSelectOperation(req, res));

export default router;