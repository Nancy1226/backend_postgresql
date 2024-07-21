import pkg from 'pg-format';
const format = pkg;
import pg from 'pg';
const { Pool } = pg;

export class DatabaseRepository {
  constructor() {
    this.pool = null;
    this.connectionDetails = null;
    this.currentDatabase = 'postgres';
  }

  //crear conexion
  async connect(connectionDetails) {
    this.connectionDetails = connectionDetails;
    console.log('Intentando conectar con detalles:', connectionDetails);
    
    try {
      this.pool = new Pool({
        host: connectionDetails.host,
        user: connectionDetails.username,
        password: connectionDetails.password,
        port: connectionDetails.port,
        database: 'postgres', // Conectar a la base de datos 'postgres' por defecto
        connectionTimeoutMillis: 5000, // Timeout de 5 segundos
      });
  
      // Intentar una conexión de prueba
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        this.currentDatabase = 'postgres';
        console.log('Conexión exitosa a la base de datos por defecto: postgres');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error.message);
      this.pool = null;
      throw new Error(`No se pudo establecer la conexión: ${error.message}`);
    }
  }

  //creacion de la base de datos
  async executeSQLDatabase(sql) {
    console.log('DatabaseRepository: Ejecutando SQL:', sql);
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      console.log('DatabaseRepository: Resultado:', result);
      return result;
    } catch (error) {
      console.error('DatabaseRepository: Error al ejecutar SQL:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createDatabase(name) {
    return this.executeSQL(`CREATE DATABASE ${name}`);
  }

  async dropDatabase(name) {
    return this.executeSQL(`DROP DATABASE ${name}`);
  }

  async renameDatabase(oldName, newName) {
    return this.executeSQL(`ALTER DATABASE ${oldName} RENAME TO ${newName}`);
  }

    //seleccion de base de datos
  async validateDatabaseExists(databaseName) {
    if (!this.pool) {
      throw new Error('No database connection established.');
    }

    const databaseNameTrimmed = databaseName.trim();
    const checkDbSql = `SELECT 1 FROM pg_database WHERE datname = $1;`;

    try {
      const result = await this.pool.query(checkDbSql, [databaseNameTrimmed]);
      console.log(`Database '${databaseNameTrimmed}' exists: ${result.rows.length > 0}`);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar la existencia de la base de datos: ${error.message}`);
    }
  }

  async switchDatabase(databaseName) {
    if (!this.pool) {
      throw new Error('No hay conexión establecida con la base de datos.');
    }
  
    const databaseNameTrimmed = databaseName.trim();
  
    // Verificar si la base de datos existe
    const databaseExists = await this.validateDatabaseExists(databaseNameTrimmed);
    if (!databaseExists) {
      console.warn(`La base de datos "${databaseNameTrimmed}" no existe. Manteniendo la conexión actual.`);
      return false;
    }
  
    try {
      // Cerrar el pool existente
      await this.pool.end();
  
      // Crear un nuevo pool con la nueva base de datos
      this.pool = new Pool({
        host: this.connectionDetails.host,
        user: this.connectionDetails.username,
        password: this.connectionDetails.password,
        port: this.connectionDetails.port,
        database: databaseNameTrimmed,
        connectionTimeoutMillis: 5000, // Timeout de 5 segundos
      });
      
      // Verificar la conexión
      const client = await this.pool.connect();
      try {
        const result = await client.query('SELECT current_database()');
        const currentDb = result.rows[0].current_database;
        
        if (currentDb !== databaseNameTrimmed) {
          throw new Error(`No se pudo cambiar a la base de datos ${databaseNameTrimmed}`);
        }
  
        this.currentDatabase = databaseNameTrimmed;
        console.log(`Cambio exitoso a la base de datos ${databaseNameTrimmed}`);
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Error al cambiar a la base de datos "${databaseNameTrimmed}": ${error.message}`);
      // Si hay un error, intentamos reconectar a la base de datos original
      this.pool = new Pool({
        host: this.connectionDetails.host,
        user: this.connectionDetails.username,
        password: this.connectionDetails.password,
        port: this.connectionDetails.port,
        database: this.currentDatabase,
        connectionTimeoutMillis: 5000,
      });
      throw error; // Propagamos el error para que pueda ser manejado en el controlador
    }
  }
  
  //creacion de tabla
  async createTable(sql) {
    if (!this.pool) {
      throw new Error('No database connection established.');
    }
  
    console.log(`Intentando crear tabla en la base de datos: ${this.currentDatabase}`);
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO public`);
      await client.query(`SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE`);
      await client.query(sql);
      console.log('Table created successfully');
    } catch (error) {
      console.error(`Error al crear tabla: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  //traer todas las tablas
  async getTables() {
    if (!this.pool) {
      throw new Error('No database connection established.');
    }
  
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO public`);
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE';
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error(`Error al obtener las tablas: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
  
    //creacion insersion de registros ala tabla
  async handleSqlInsert(sqlString) {
    if (!this.pool) {
      throw new Error('No database connection established.');
    }

    const client = await this.pool.connect();
    try {
      // Extraer información de la sentencia SQL
      const match = sqlString.match(/INSERT\s+INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
      if (!match) {
        throw new Error('La sentencia SQL no es un INSERT válido.');
      }

      const [, tableName, columnsString, valuesString] = match;
      const columns = columnsString.split(',').map(col => col.trim());
      const values = valuesString.split(',').map(val => val.trim());

      // Obtener la estructura de la tabla
      const tableStructure = await this.getTableStructure(tableName);

      // Validar que los campos en el INSERT coincidan exactamente con la estructura de la tabla
      const extraFields = columns.filter(field => !tableStructure.includes(field));
      const missingFields = tableStructure.filter(field => !columns.includes(field));

      if (extraFields.length > 0) {
        throw new Error(`Los siguientes campos no existen en la tabla: ${extraFields.join(', ')}`);
      }

      if (missingFields.length > 0) {
        throw new Error(`Faltan los siguientes campos de la tabla: ${missingFields.join(', ')}`);
      }

      // Usar pg-format para construir una sentencia SQL segura
      const formattedSql = format('INSERT INTO %I (%I) VALUES (%L)', tableName, columns, values);

      // Ejecutar la sentencia SQL formateada
      await client.query(formattedSql);
      return { message: 'Datos insertados con éxito.' };
    } finally {
      client.release();
    }
  }

  async getTableStructure(tableName) {
    const sql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
    `;
    const result = await this.pool.query(sql, [tableName]);
    return result.rows.map(row => row.column_name);
  }

  async listDatabases() {
    if (!this.pool) {
      throw new Error('No database connection established.');
    }
    const listDbSql = `SELECT datname FROM pg_database WHERE datistemplate = false;`; const client = await this.pool.connect();
    try { const result = await client.query(listDbSql); return result.rows.map(row => row.datname); } finally { client.release(); }
  }

  //traer todas las bases de datos
  async getDatabases() {
    const sql = "SELECT datname FROM pg_database WHERE datistemplate = false;"; 
    const client = await this.pool.connect(); 
    try { 
      const result = await client.query(sql); return result.rows; 
    } 
    finally { 
      client.release(); 
    }
  }
}
