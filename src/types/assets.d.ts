declare module '*.png';
declare module '*.jpg';
declare module '*.svg' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}
declare module '*.css';
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
