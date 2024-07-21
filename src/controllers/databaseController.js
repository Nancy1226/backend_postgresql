import { format } from 'sql-formatter';
import pkg from 'node-sql-parser';
const { Parser } = pkg;

export class DatabaseController {
  constructor( databaseUseCase,createTableUseCase, insertDataUseCase, switchDatabaseUseCase, getDatabasesUseCase, connectDatabaseUseCase) {
    // this.createDatabaseUseCase = createDatabaseUseCase;
    this.databaseUseCase = databaseUseCase;
    this.parser = new Parser();
    this.createTableUseCase = createTableUseCase;
    this.insertDataUseCase = insertDataUseCase;
    this.switchDatabaseUseCase = switchDatabaseUseCase;
    this.getDatabasesUseCase = getDatabasesUseCase;
    this.connectDatabaseUseCase = connectDatabaseUseCase;
    this.getCurrentDatabase = switchDatabaseUseCase.getCurrentDatabase.bind(switchDatabaseUseCase);
  }

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

  // async createDatabase(req, res) {
  //   const { sql } = req.body;
  //   if (!sql) {
  //     return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
  //   }

  //   try {
  //     const formattedSQL = format(sql);
  //     const parser = new Parser();
  //     parser.astify(formattedSQL, { database: 'PostgreSQL' }); // Validar SQL
  //     await this.createDatabaseUseCase.execute(formattedSQL);
  //     res.status(200).json({ message: 'Base de datos creada con éxito.' });
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // }

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

  async getDatabases(req, res) {
    try {
      const databases = await this.getDatabasesUseCase.getDatabases();
      res.status(200).json({ databases });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTable(req, res) {
    const { sql, databaseName } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
    }
  
    try {
      if (databaseName) {
        await this.switchDatabaseUseCase.switch(databaseName);
      }
      console.log(`nombre de la base de datos ${databaseName}`);
      console.log(`ejecucion sql ${sql}`);
      const formattedSQL = format(sql);
      const parser = new Parser();
      parser.astify(formattedSQL, { database: 'PostgreSQL' }); // Validar SQL
      await this.createTableUseCase.execute(formattedSQL);
      res.status(200).json({ message: 'Tabla creada con éxito.' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async insertData(req, res) {
      const sqlString = req.body.sql || req.body.sqlString;
      if (!sqlString) {
        return res.status(400).json({ error: 'La sentencia SQL es requerida.' });
      }
      try {
        const result = await this.insertDataUseCase.insert(sqlString);
        res.status(200).json(result);
      } catch (error) {
        console.error('Error al insertar datos:', error.message);
        if (error.message.includes('no es un INSERT válido') || 
            error.message.includes('no existen en la tabla') || 
            error.message.includes('Faltan los siguientes campos')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud.' });
        }
      }
    }


}