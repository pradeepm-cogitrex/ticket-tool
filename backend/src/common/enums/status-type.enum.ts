/** Open-type statuses count as active work and run the SLA clock; closed-type statuses end it. */
export enum StatusType {
  Open = 'open',
  Closed = 'closed',
}
