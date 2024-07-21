import { format } from 'sql-formatter';
import pkg from 'node-sql-parser';
const { Parser } = pkg;

export class DatabaseController {
  constructor( databaseUseCase,createTableUseCase, getTablesUseCase ,insertDataUseCase, switchDatabaseUseCase, getDatabasesUseCase, selectDataUseCase, connectDatabaseUseCase) {
    this.databaseUseCase = databaseUseCase;
    this.parser = new Parser();
    this.createTableUseCase = createTableUseCase;
    this.getTablesUseCase = getTablesUseCase;
    this.insertDataUseCase = insertDataUseCase;
    this.selectDataUseCase = selectDataUseCase;
    this.switchDatabaseUseCase = switchDatabaseUseCase;
    this.getDatabasesUseCase = getDatabasesUseCase;
    this.connectDatabaseUseCase = connectDatabaseUseCase;
    this.getCurrentDatabase = switchDatabaseUseCase.getCurrentDatabase.bind(switchDatabaseUseCase);
  }

  //conexion de base de datos
  async connect(req, res) {
    const { host, username, password, port } = req.body;
  
    if (!host || !username || !password || !port) {
      return res.status(400).json({ error: 'Todos los campos son requeridos: host, username, password, port.' });
    }
  
    try {
      await this.connectDatabaseUseCase.connect({ host, username, password, port });
      res.status(200).json({ message: 'Conexión exitosa' });
    } catch (error) {
      console.error('Error en el controlador al conectar:', error.message);
      res.status(500).json({ error: error.message });
    }
  }


  //creacion base de datos
  async handleDatabaseOperation(req, res) {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
    }

    try {
      console.log('SQL recibida:', sql);
      const formattedSQL = format(sql);
      console.log('SQL formateada:', formattedSQL);

      if (formattedSQL.trim().toUpperCase().startsWith('ALTER DATABASE')) {
        const parts = formattedSQL.split(/\s+/);
        if (parts.length >= 6 && parts[3].toUpperCase() === 'RENAME' && parts[4].toUpperCase() === 'TO') {
          const oldName = parts[2];
          const newName = parts[5].replace(';', '');
          console.log(`Renombrando base de datos de ${oldName} a ${newName}`);
          const result = await this.databaseUseCase.execute(formattedSQL);
          return res.status(200).json({
            message: `Base de datos renombrada de ${oldName} a ${newName}`
       
          });
        } else {
          return res.status(400).json({ error: 'Sintaxis de ALTER DATABASE inválida.' });
        }
      }

      const ast = this.parser.astify(formattedSQL);
      console.log('AST:', JSON.stringify(ast, null, 2));

      const detectedOperation = ast[0]?.type?.toLowerCase();
      console.log('Operación detectada:', detectedOperation);
      
      if (!['create', 'drop', 'alter'].includes(detectedOperation)) {
        return res.status(400).json({ error: 'Operación no soportada o no reconocida.' });
      }

      console.log('Ejecutando la sentencia SQL...');
      const result = await this.databaseUseCase.execute(formattedSQL);
      console.log('Resultado de la ejecución:', result);
  
      res.status(200).json({ 
        message: `Operación de base de datos (${detectedOperation}) ejecutada con éxito.`
        // result: result
      });
    } catch (error) {
      console.error('Error en handleDatabaseOperation:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

// seleccion de base de datos
  async switchDatabase(req, res) {
    const { databaseName } = req.body;
    if (!databaseName) {
      return res.status(400).json({ error: 'El nombre de la base de datos es requerido.' });
    }
  
    try {
      const switched = await this.switchDatabaseUseCase.switch(databaseName);
      if (switched) {
        res.status(200).json({ message: `Cambio a la base de datos ${databaseName} realizado con éxito.` });
      } else {
        res.status(400).json({ error: `No se pudo cambiar a la base de datos ${databaseName}` });
      }
    } catch (error) {
      console.error(`Error switching database: ${error.message}`);
      if (error.message.includes('password authentication failed')) {
        res.status(401).json({ error: 'Error de autenticación. Verifique sus credenciales.' });
      } else if (error.message.includes('no existe')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  //Traer todas las bases de datos
  async getDatabases(req, res) {
    try {
      const databases = await this.getDatabasesUseCase.getDatabases();
      res.status(200).json({ databases });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //creacion de tabla
  async createTable(req, res) {
    const { sql, databaseName } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
    }
  
    try {
      if (databaseName) {
        await this.switchDatabaseUseCase.switch(databaseName);
      }
      console.log(`Nombre de la base de datos: ${databaseName}`);
      console.log(`Ejecución SQL: ${sql}`);
      
      const formattedSQL = format(sql);
      const parser = new Parser();
      
      // Validar SQL
      const ast = parser.astify(formattedSQL, { database: 'PostgreSQL' });
  
      // Validar tipo de operación (CREATE, DROP, ALTER)
      const validOperations = ['create', 'drop', 'alter'];
      const operation = ast[0].type.toLowerCase();
      if (!validOperations.includes(operation)) {
        return res.status(400).json({ error: 'Operación SQL no permitida. Solo se permiten CREATE, DROP y ALTER.' });
      }
      
      await this.createTableUseCase.execute(formattedSQL);
      res.status(200).json({ message: 'Operación SQL ejecutada con éxito.' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
  
  //traer todas las tablas
  async getTables(req, res) {
    const { databaseName } = req.query;
  
    try {
      if (databaseName) {
        await this.switchDatabaseUseCase.switch(databaseName);
      }
      console.log(`Obteniendo tablas de la base de datos: ${databaseName}`);
      
      const tables = await this.getTablesUseCase.execute();
      res.status(200).json({ tables });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
  
  //insercion de registros ala tabla
  async handleDataOperation(req, res) {
    const sqlString = req.body.sql || req.body.sqlString;
    if (!sqlString) {
      return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
    }

    try {
      const lowerSql = sqlString.toLowerCase();
      let result;
      if (lowerSql.startsWith('insert')) {
        result = await this.insertDataUseCase.insert(sqlString);
      } else if (lowerSql.startsWith('delete')) {
        result = await this.insertDataUseCase.delete(sqlString);
      } else if (lowerSql.startsWith('update')) {
        result = await this.insertDataUseCase.update(sqlString);
      } else {
        return res.status(400).json({ error: 'La operación SQL no es válida. Solo se permiten INSERT, DELETE y UPDATE.' });
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al procesar la solicitud:', error.message);
      if (error.message.includes('no es un INSERT válido') || 
          error.message.includes('no es un DELETE válido') || 
          error.message.includes('no es un UPDATE válido') ||
          error.message.includes('no existen en la tabla') || 
          error.message.includes('Faltan los siguientes campos')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud.' });
      }
    }
  }

  //seleccion de la tabla
  async handleSelectOperation(req, res) {
    const sqlString = req.body.sql || req.body.sqlString;
    if (!sqlString) {
      return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
    }

    try {
      const result = await this.selectDataUseCase.select(sqlString);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      res.status(500).json({
        error: 'Error interno del servidor al procesar la solicitud.',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
}