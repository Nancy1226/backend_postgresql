// src/usecases/getDatabasesUseCase.js
export class GetDatabasesUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async getDatabases() {
    return this.databaseRepository.getDatabases();
  }
}
