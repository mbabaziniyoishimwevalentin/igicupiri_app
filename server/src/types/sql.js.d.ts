declare module 'sql.js' {
  // Minimal type declarations for sql.js
  export interface SqlJsStatic {
    Database: any;
  }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
