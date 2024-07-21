export class SelectDataUseCase {
    constructor(databaseRepository) {
      this.databaseRepository = databaseRepository;
    }
  
    async select(sqlString) {
      return this.databaseRepository.handleSqlSelect(sqlString);
    }
  }
  