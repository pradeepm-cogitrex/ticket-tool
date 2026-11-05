import { DeepPartial, EntityManager, FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/** Common data access shared by every module repo. Module repos extend this and add their own queries. */
export abstract class BaseRepo<T extends ObjectLiteral & { id: number }> {
  protected constructor(protected readonly repo: Repository<T>) {}

  get manager(): EntityManager {
    return this.repo.manager;
  }

  findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  findById(id: number, relations: string[] = []): Promise<T | null> {
    return this.repo.findOne({ where: { id } as unknown as FindOptionsWhere<T>, relations });
  }

  findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repo.findOneBy(where);
  }

  count(options?: FindManyOptions<T>): Promise<number> {
    return this.repo.count(options);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: DeepPartial<T>): Promise<T | null> {
    await this.repo.save({ ...data, id } as DeepPartial<T>);
    return this.findById(id);
  }

  save(entity: T): Promise<T> {
    return this.repo.save(entity);
  }

  /** Counts tickets per value of a ticket column, e.g. product_id → { 1: 12, 2: 4 }. */
  protected async ticketCountBy(column: 'client_id' | 'product_id' | 'module_id' | 'ticket_type_id' | 'priority_id' | 'status_id'): Promise<Record<number, number>> {
    const rows: { id: number; total: string | number }[] = await this.manager.query(
      `SELECT ${column} AS id, COUNT(*) AS total FROM tickets GROUP BY ${column}`,
    );
    return Object.fromEntries(rows.map((r) => [Number(r.id), Number(r.total)]));
  }
}
