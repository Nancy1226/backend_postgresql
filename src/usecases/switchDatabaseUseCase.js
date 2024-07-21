export class SwitchDatabaseUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async switch(databaseName) {
    return await this.databaseRepository.switchDatabase(databaseName);
  }

  getCurrentDatabase() {
    return this.databaseRepository.getCurrentDatabase();
  }

}