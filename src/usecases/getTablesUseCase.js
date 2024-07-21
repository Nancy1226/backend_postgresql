export class GetTablesUseCase {
    constructor(databaseRepository) {
      this.databaseRepository = databaseRepository;
    }
  
    async execute() {
      return this.databaseRepository.getTables();
    }
  }
  