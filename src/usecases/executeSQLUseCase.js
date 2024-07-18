export class ExecuteSQLUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async execute(sql, params = []) {
    return this.databaseRepository.executeSQL(sql, params);
  }
}
