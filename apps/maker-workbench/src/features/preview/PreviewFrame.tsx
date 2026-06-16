import { forwardRef } from 'react';

export type PreviewFrameProps = {
  src: string;
  onLoad: () => void;
};

export const PreviewFrame = forwardRef<HTMLIFrameElement, PreviewFrameProps>(function PreviewFrame({ src, onLoad }, ref) {
  return <iframe className="h-full w-full border-0" title="Game preview" src={src} sandbox="allow-scripts" ref={ref} onLoad={onLoad} />;
});
