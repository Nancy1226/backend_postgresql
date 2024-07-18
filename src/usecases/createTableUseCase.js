export class CreateTableUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async execute(sql) {
    return this.databaseRepository.createTable(sql);
  }
}
