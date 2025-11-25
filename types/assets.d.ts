// Allow import of files like 'icon.png?asset' in the main process
// so TypeScript doesn't complain while building.

declare module "*?asset" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
