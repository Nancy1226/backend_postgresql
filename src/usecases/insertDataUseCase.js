export class InsertDataUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }
  
  async insert(sqlString) {
    return this.databaseRepository.handleSqlInsert(sqlString);
  }
}