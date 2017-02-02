export class NotFoundError extends Error {
  constructor(message, query) {
    super(message);
    this.query = query;
  }
  toString() {
    let message = super.toString();
    message += '\n-------------- QUERY --------------\n' + JSON.stringify(this.query);
    return message;
  }
}
