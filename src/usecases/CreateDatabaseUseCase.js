export class CreateDatabaseUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async execute(sql) {
    return this.databaseRepository.executeSQL(sql);
  }
}
