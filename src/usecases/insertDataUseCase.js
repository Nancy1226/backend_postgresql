export class InsertDataUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async insert(sqlString) {
    return this.databaseRepository.handleSqlInsert(sqlString);
  }

  async delete(sqlString) {
    return this.databaseRepository.handleSqlDelete(sqlString);
  }

  async update(sqlString) {
    return this.databaseRepository.handleSqlUpdate(sqlString);
  }
}