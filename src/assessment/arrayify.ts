// Arrayifys an object.
export default function arrayify(object: any, newKey: string): any[] {
  return Object.entries(object).map(([key, value]: any) => ({
    [newKey]: key,
    ...value
  }));
}
