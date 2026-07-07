import React, { useEffect, useRef } from 'react';

/* Mounts a vanilla renderer (from lib/charts.js) into a div, re-running on deps. */
export default function SvgChart({ render, deps }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) render(ref.current); }, deps); // eslint-disable-line
  return <div ref={ref} />;
}
