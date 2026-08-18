// Lets TypeScript understand bundled audio assets imported in the catalog.
declare module "*.mp3" {
  const src: number;
  export default src;
}
