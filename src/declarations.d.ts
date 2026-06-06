declare module '*.css';
declare module '*.svg' {
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export { ReactComponent };
  export default src;
}
