export class DatabaseUseCase {
    constructor(databaseRepository) {
      this.databaseRepository = databaseRepository;
    }
  
    async execute(sql) {
      console.log('DatabaseUseCase: Ejecutando SQL:', sql);
      try {
        const result = await this.databaseRepository.executeSQLDatabase(sql);
        console.log('DatabaseUseCase: Resultado:', result);
        return result;
      } catch (error) {
        console.error('DatabaseUseCase: Error al ejecutar SQL:', error);
        throw error; // Re-lanzamos el error para que pueda ser manejado en el controlador
      }
    }
}