declare module '@mapbox/polyline' {
  function decode(str: string, precision?: number): [number, number][];
  function encode(coordinates: [number, number][], precision?: number): string;
  function fromGeoJSON(geojson: object, precision?: number): string;
  function toGeoJSON(str: string, precision?: number): object;
}
