import Dexie, { Table } from 'dexie'

/**
 * データベースのアイテムの型
 */
export interface PlayerModel {
  id?: number
  item: File
}

/**
 * データベース
 */
export class PlayerModelsDatabase extends Dexie {
  
  /** テーブル */
  models!: Table<PlayerModel>

  /**
   * コンストラクタ(データベースの作成)
   */
  constructor() {
    super('playerModelsDatabase')
    this.version(1).stores({
      models: '++id, item'
    })
  }

}

/** データベース */
export const database = new PlayerModelsDatabase()