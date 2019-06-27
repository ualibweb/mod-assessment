export default class QueryParameterError extends Error {
  constructor() {
    super();
    this.name = 'QueryParameterError';
  }
}
