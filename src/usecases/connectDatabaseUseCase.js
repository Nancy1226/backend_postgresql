// src/usecases/connectDatabaseUseCase.js
export class ConnectDatabaseUseCase {
  constructor(databaseRepository) {
    this.databaseRepository = databaseRepository;
  }

  async connect(connectionDetails) {
    return this.databaseRepository.connect(connectionDetails);
  }
}
